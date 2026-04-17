import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
  UnauthorizedException,
} from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { JobRepository } from '../repositories/job.repository'
import { CreateJobRequest } from '../dtos/request/create-job.request'
import { UpdateJobRequest } from '../dtos/request/update-job.request'
import {
  JobApplicationStatus,
  JobStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  ReportStatus,
} from 'src/generated/prisma/enums'
import { ApplyJobRequest } from '../dtos/request/apply-job.request'
import { GetJobsByEmployerDto } from '../dtos/request/get-jobs-employer.dto'
import { JOB_CONSTANTS } from '../constant/job.constant'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'
import {
  JobModerationService,
  ModerationStatus,
} from './job-moderation.service'
// import { EmbeddingQueueService } from 'src/infrastructure/queue/embedding/service/embedding-queue.service'
import { JobReportDto } from '../dtos/job.report.request.dto'
import { BoostCheckoutRequestDto } from '../dtos/request/boost-checkout.request'
import { ConfirmBoostPaymentRequestDto } from '../dtos/request/confirm-boost-payment.request'
import { SepayService } from './sepay.service'

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name)
  private readonly BOOST_SHORT_DAYS = 7
  private readonly BOOST_LONG_DAYS = 30
  private readonly BOOST_PRICE_BY_DAYS: Record<number, number> = {
    7: 10000,
    30: 20000,
  }

  private shuffleBoostedJobs<T>(items: T[]): T[] {
    const shuffled = [...items]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly sepayService: SepayService,
    // private readonly embeddingQueueService: EmbeddingQueueService,
    @Inject(forwardRef(() => AIMatchingService))
    private readonly aiMatchingService: AIMatchingService,
    private readonly moderationService: JobModerationService,
  ) { }

  async searchJobs(q: any) {
    await this.jobRepository.deactivateExpiredBoosts()

    const keyword = q.keyword?.trim() || ''
    const province = q.province?.trim() || ''
    const district = q.district
    // const salaryMin = q.salaryMin
    // const salaryMax = q.salaryMax
    const genderRequirement = q.genderRequirement
    // const ageMin = q.ageMin
    // const ageMax = q.ageMax
    const workingShift = q.workingShift
    const occupationId = q.occupationId
    const companyId = q.companyId
    const page = q.page || 1
    const limit = q.limit || 10
    const skip = (page - 1) * limit
    const where: any = {}
    if (!q.allStatus) {
      where.status = JobStatus.PUBLISHED
    } else {
      where.status = { not: JobStatus.DELETED }
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ]
    }
    if (workingShift) {
      where.workingShift = { equals: workingShift }
    }
    if (occupationId) {
      where.occupationId = { equals: Number(occupationId) }
    }
    if (companyId) {
      where.companyId = { equals: Number(companyId) }
    }
    if (province) {
      where.province = { contains: province, mode: 'insensitive' }
    }
    if (district) {
      where.district = { contains: district, mode: 'insensitive' }
    }
    if (genderRequirement) {
      where.genderRequirement = { equals: genderRequirement }
    }
    // if(salaryMin)
    const sortBy = q.sortBy || 'newest'
    const orderBy =
      sortBy === 'salary_desc'
        ? [{ salaryMax: 'desc' }, { createdAt: 'desc' }]
        : sortBy === 'salary_asc'
          ? [{ salaryMax: 'asc' }, { createdAt: 'desc' }]
          : sortBy === 'view'
            ? [{ viewCount: 'desc' }, { createdAt: 'desc' }]
            : [{ createdAt: 'desc' }]
    const { items, total } = await this.jobRepository.searchJobs(
      where,
      orderBy,
      limit,
      skip,
    )
    return {
      success: true,
      items,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    }
  }

  async getBoostedJobs(page = 1, limit = 10) {
    await this.jobRepository.deactivateExpiredBoosts()

    const safePage = page > 0 ? page : 1
    const safeLimit = Math.min(Math.max(limit, 1), 50)
    const skip = (safePage - 1) * safeLimit

    const { items, total } = await this.jobRepository.getBoostedJobs(
      safeLimit,
      skip,
    )
    const randomizedItems = this.shuffleBoostedJobs(items)

    return {
      success: true,
      items: randomizedItems,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPage: Math.ceil(total / safeLimit),
      },
    }
  }

  async createBoostCheckout(
    jobId: number,
    companyId: number,
    body: BoostCheckoutRequestDto,
  ) {
    const job = await this.jobRepository.findJobById(jobId)
    if (!job || job.companyId !== companyId) {
      throw new NotFoundException('Job not found or unauthorized')
    }

    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Only published jobs can be boosted')
    }

    const packageDays = body.packageDays ?? this.BOOST_SHORT_DAYS
    const defaultAmount = this.BOOST_PRICE_BY_DAYS[packageDays]

    if (!defaultAmount) {
      throw new BadRequestException('Package boost không hợp lệ')
    }

    if (body.paymentMethod && body.paymentMethod !== PaymentMethod.SEPAY) {
      throw new BadRequestException(
        'Hiện tại chỉ hỗ trợ thanh toán boost qua SEPAY',
      )
    }

    const amount = body.amount ?? defaultAmount
    if (amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán không hợp lệ')
    }

    const order = await this.jobRepository.createBoostPaymentOrder({
      userId: job.company.ownerId,
      jobId,
      amount,
      paymentMethod: body.paymentMethod ?? PaymentMethod.SEPAY,
    })

    const checkout = this.sepayService.buildBoostCheckout(order.id, amount)

    return {
      success: true,
      data: {
        paymentOrderId: order.id,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        packageDays,
        paymentCode: checkout.paymentCode,
        paymentUrl: checkout.paymentUrl,
        transferNote: checkout.transferNote,
        bankCode: checkout.bankCode,
        accountNumber: checkout.accountNumber,
        accountName: checkout.accountName,
      },
      message:
        'Đã tạo đơn boost. Hãy thanh toán bằng QR/chuyển khoản đúng nội dung để SePay tự xác nhận.',
    }
  }

  async handleSepayWebhook(
    authorizationHeader?: string,
    payload?: Record<string, unknown>,
  ) {
    this.logger.log('SePay webhook received')

    if (!this.sepayService.isValidWebhookAuthorization(authorizationHeader)) {
      this.logger.warn('SePay webhook rejected: invalid authorization header')
      throw new UnauthorizedException(
        'SePay webhook authorization không hợp lệ',
      )
    }

    if (!payload || typeof payload !== 'object') {
      this.logger.warn('SePay webhook rejected: invalid payload')
      throw new BadRequestException('Payload webhook không hợp lệ')
    }

    const transferType =
      typeof payload.transferType === 'string'
        ? payload.transferType.toLowerCase()
        : ''
    if (transferType !== 'in') {
      this.logger.log(
        `SePay webhook ignored: transferType=${transferType || '(empty)'}`,
      )
      return { success: true, message: 'Bỏ qua giao dịch không phải tiền vào' }
    }

    const orderId = this.sepayService.extractOrderIdFromPayload(payload)
    if (!orderId) {
      this.logger.warn('SePay webhook ignored: cannot extract BOOST order id')
      return {
        success: true,
        message: 'Bỏ qua giao dịch không chứa mã boost hợp lệ',
      }
    }

    const order = await this.jobRepository.findPaymentOrderById(orderId)
    if (!order || order.orderType !== OrderType.BOOST_JOB) {
      this.logger.warn(
        `SePay webhook ignored: order not found or not BOOST_JOB (orderId=${orderId})`,
      )
      return { success: true, message: 'Không tìm thấy boost order tương ứng' }
    }

    if (order.paymentMethod !== PaymentMethod.SEPAY) {
      this.logger.warn(
        `SePay webhook ignored: payment method mismatch (orderId=${order.id}, method=${order.paymentMethod})`,
      )
      return { success: true, message: 'Order không dùng phương thức SEPAY' }
    }

    if (order.status === PaymentStatus.COMPLETED) {
      this.logger.log(`SePay webhook ignored: order already completed (orderId=${order.id})`)
      return { success: true, message: 'Order đã xử lý trước đó' }
    }

    if (!order.targetId) {
      this.logger.warn(`SePay webhook ignored: order has no targetId (orderId=${order.id})`)
      return { success: true, message: 'Order không có target job' }
    }

    const transferAmount = Number(payload.transferAmount ?? payload.amount ?? 0)
    if (!Number.isFinite(transferAmount) || transferAmount < order.amount) {
      this.logger.warn(
        `SePay webhook ignored: insufficient amount (orderId=${order.id}, required=${order.amount}, transfer=${transferAmount})`,
      )
      return {
        success: true,
        message: 'Số tiền chưa đủ để kích hoạt boost',
        data: {
          paymentOrderId: order.id,
          requiredAmount: order.amount,
          transferAmount,
        },
      }
    }

    const durationDays =
      order.amount >= this.BOOST_PRICE_BY_DAYS[this.BOOST_LONG_DAYS]
        ? this.BOOST_LONG_DAYS
        : this.BOOST_SHORT_DAYS
    const referenceCode =
      typeof payload.referenceCode === 'string' ? payload.referenceCode : null
    const rawTransactionCode =
      typeof payload.transactionCode === 'string'
        ? payload.transactionCode
        : null
    const webhookId =
      typeof payload.id === 'number' || typeof payload.id === 'string'
        ? String(payload.id)
        : null

    const transactionCode =
      referenceCode || rawTransactionCode || webhookId || String(order.id)

    const result = await this.jobRepository.activateBoostAfterPayment({
      orderId: order.id,
      jobId: order.targetId,
      durationDays,
      transactionCode,
    })

    this.logger.log(
      `SePay webhook processed successfully: orderId=${result.order.id}, jobId=${result.job.id}`,
    )

    return {
      success: true,
      message: 'Đã xác nhận thanh toán SePay và kích hoạt boost',
      data: {
        paymentOrderId: result.order.id,
        jobId: result.job.id,
        isBoosted: result.job.isBoosted,
        boostExpiredAt: result.job.boostExpiredAt,
      },
    }
  }

  async confirmBoostPayment(
    jobId: number,
    companyId: number,
    body: ConfirmBoostPaymentRequestDto,
  ) {
    const job = await this.jobRepository.findJobById(jobId)
    if (!job || job.companyId !== companyId) {
      throw new NotFoundException('Job not found or unauthorized')
    }

    const order = await this.jobRepository.findPaymentOrderById(
      body.paymentOrderId,
    )

    if (!order || order.targetId !== jobId) {
      throw new NotFoundException('Payment order không tồn tại cho job này')
    }

    if (order.status === PaymentStatus.COMPLETED) {
      return {
        success: true,
        message: 'Đơn thanh toán đã được xác nhận trước đó',
        data: {
          jobId,
          isBoosted: job.isBoosted,
          boostExpiredAt: job.boostExpiredAt,
          paymentOrderId: order.id,
        },
      }
    }

    if (order.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Chỉ đơn PENDING mới có thể xác nhận')
    }

    const durationDays =
      order.amount >= this.BOOST_PRICE_BY_DAYS[this.BOOST_LONG_DAYS]
        ? this.BOOST_LONG_DAYS
        : this.BOOST_SHORT_DAYS

    const result = await this.jobRepository.activateBoostAfterPayment({
      orderId: order.id,
      jobId,
      durationDays,
      transactionCode: body.transactionCode,
    })

    return {
      success: true,
      message: 'Thanh toán thành công và đã kích hoạt boost cho job',
      data: {
        paymentOrderId: result.order.id,
        jobId: result.job.id,
        isBoosted: result.job.isBoosted,
        boostExpiredAt: result.job.boostExpiredAt,
      },
    }
  }

  async getWistlist(
    userId: number,
    page?: number,
    limit?: number,
    skip?: number,
  ) {
    const where = {
      userId: userId,
    }
    const orderBy = {
      createdAt: 'desc',
    }
    const { items, total } = await this.jobRepository.getWishList(
      where,
      orderBy,
      limit || 10,
      skip || 0,
    )
    return {
      success: true,
      items,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / (limit || 10)),
      },
    }
  }

  async saveJob(userId: number, jobId: number) {
    const job = await this.jobRepository.findJobById(jobId)
    if (!job) {
      throw new NotFoundException('Job not found')
    }

    const existing = await this.jobRepository.findSavedJob(userId, jobId)
    if (existing) {
      return { success: true, message: 'Job already saved' }
    }

    await this.jobRepository.saveJob(userId, jobId)
    return { success: true, message: 'Job saved successfully' }
  }

  async unSaveJob(userId: number, jobId: number) {
    const existing = await this.jobRepository.findSavedJob(userId, jobId)
    if (!existing) {
      return { success: true, message: 'Job not saved yet' }
    }

    await this.jobRepository.unSaveJob(userId, jobId)
    return { success: true, message: 'Job unsaved successfully' }
  }

  async createJob(dto: CreateJobRequest, companyId: number) {
    // ==============================
    // 1️⃣ Business Validation
    // ==============================

    if (
      dto.salaryMin != null &&
      dto.salaryMax != null &&
      dto.salaryMin > dto.salaryMax
    ) {
      throw new BadRequestException(
        'salaryMin cannot be greater than salaryMax',
      )
    }

    if (dto.ageMin != null && dto.ageMax != null && dto.ageMin > dto.ageMax) {
      throw new BadRequestException('ageMin cannot be greater than ageMax')
    }

    if (dto.expiredAt && new Date(dto.expiredAt) < new Date()) {
      throw new BadRequestException('expiredAt must be in the future')
    }

    // ==============================
    // 2️⃣ Prepare Job Data
    // ==============================

    const jobData: any = {
      title: dto.title,
      description: dto.description,
      occupationId: dto.occupationId,
      workingShift: dto.workingShift,
      quantity: dto.quantity,
      genderRequirement: dto.genderRequirement,
      address: dto.address,
      province: dto.province,
      district: dto.district,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      ageMin: dto.ageMin,
      ageMax: dto.ageMax,
      expiredAt: dto.expiredAt ? new Date(dto.expiredAt) : undefined, // hoặc set mặc định 30 ngày nếu muốn

      companyId,
      status: JobStatus.PUBLISHED, // Default to PUBLISHED
    }

    // AI CONTENT MODERATION
    try {
      this.logger.log(`Starting AI moderation for job: ${dto.title}`);
      const moderationResult = await this.moderationService.moderateJob({ ...jobData, fields: dto.fields });

      if (moderationResult.status === ModerationStatus.SPAM) {
        this.logger.warn(
          `AI REJECTED job as SPAM. Reason: ${moderationResult.reason}`,
        );
        throw new BadRequestException(
          `Tin tuyển dụng bị từ chối do có dấu hiệu SPAM (AI detect): ${moderationResult.reason}. Vui lòng kiểm tra và viết lại nội dung nghiêm túc.`,
        );
      } else if (moderationResult.status === ModerationStatus.SCAM) {
        this.logger.warn(
          `AI FLAGGED job as SCAM. Reason: ${moderationResult.reason}`,
        );
        jobData.status = JobStatus.WARNING;
      }
    } catch (moderationError) {
      if (moderationError instanceof BadRequestException) {
        throw moderationError
      }
      this.logger.error('Moderation failed:', moderationError)
      // Fallback: Nếu AI lỗi kỹ thuật thì cho vào WARNING để manager check, không chặn user
      jobData.status = JobStatus.WARNING
    }

    // ==============================
    // 3️⃣ Call Repository
    // ==============================

    try {
      const created = await this.jobRepository.createJobWithForm({
        jobData,
        fields: dto.fields,
      })

      //this.embeddingQueueService.queueJobEmbedding(created.id)
      // Gọi trực tiếp embedding (không qua queue)
      await this.aiMatchingService.buildJobEmbedding(created.id)

      // ==============================
      // 4️⃣ Return Response
      // ==============================

      return {
        success: true,
        data: created,
        message:
          created.status === JobStatus.WARNING
            ? 'Tin của bạn đã được lưu nhưng đang chờ duyệt do có dấu hiệu nghi vấn (AI detect)'
            : 'Đăng tin tuyển dụng thành công',
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown prisma error'
      console.error(
        '\n\n==== PRISMA ERROR LOG ====\n',
        errorMessage,
        '\n==========================\n',
      )
      throw error
    }
  }

  async updateJob(jobId: number, dto: UpdateJobRequest, companyId: number) {
    const job = await this.jobRepository.findJobById(jobId)

    if (!job || job.companyId !== companyId) {
      throw new Error('Job not found or unauthorized')
    }

    const update = await this.jobRepository.updateJobFull(jobId, dto)

    /* Queue-based (tạm comment):
    // this.embeddingQueueService.queueJobEmbedding(jobId)
    */

    // Gọi trực tiếp embedding (không qua queue)
    await this.aiMatchingService.buildJobEmbedding(jobId)

    return update
  }

  async getDetail(jobId: number) {
    const job = await this.jobRepository.findJobById(jobId)

    if (!job) {
      throw new Error('Job not found')
    }

    // return {
    //   success: true,
    //   data: job
    // };

    return job
  }

  async deleteJob(jobId: number, companyId: number) {
    const job = await this.jobRepository.findJobById(jobId)

    if (!job || job.companyId !== companyId) {
      throw new Error('Job not found or unauthorized')
    }

    await this.jobRepository.deleteJob(jobId)

    return { success: true }
  }

  async getApplyForm(jobId: number) {
    const jobWithForm = await this.jobRepository.findJobWithApplyForm(jobId)

    if (!jobWithForm) {
      throw new NotFoundException('Job not found')
    }

    if (jobWithForm.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Job is not available for apply')
    }

    if (!jobWithForm.applyForms?.length) {
      throw new BadRequestException('Apply form has not been created')
    }

    return {
      success: true,
      data: {
        jobId: jobWithForm.id,
        title: jobWithForm.title,
        formId: jobWithForm.applyForms[0].id,
        fields: jobWithForm.applyForms[0].fields,
      },
    }
  }

  async applyJob(jobId: number, userId: number, body: ApplyJobRequest) {
    // Check job exists and published
    const job = await this.jobRepository.findJobById(jobId)
    if (!job) {
      throw new NotFoundException('Job not found')
    }

    if (job.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Job is not available for apply')
    }

    // Get form if exists (optional now)
    const jobWithForm = await this.jobRepository.findJobWithApplyForm(jobId)
    const form = jobWithForm?.applyForms?.[0]
    const answers = body.answers || []

    // Validate answers only if form exists
    if (form && form.fields.length > 0) {
      const answerByFieldId = new Map<number, string>()

      for (const answer of answers) {
        if (answerByFieldId.has(answer.fieldId)) {
          throw new BadRequestException(
            `Duplicate answer for fieldId ${answer.fieldId}`,
          )
        }
        answerByFieldId.set(answer.fieldId, answer.value?.trim())
      }

      for (const field of form.fields) {
        const value = answerByFieldId.get(field.id)

        if (field.isRequired && !value) {
          throw new BadRequestException(`Field "${field.label}" is required`)
        }

        if (value && field.options) {
          let parsedOptions: string[] = []

          try {
            const raw = JSON.parse(field.options)
            if (Array.isArray(raw)) {
              parsedOptions = raw.map((item: any) => String(item))
            }
          } catch {
            parsedOptions = []
          }

          if (parsedOptions.length > 0) {
            const selected =
              field.fieldType === 'checkbox'
                ? value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean)
                : [value]

            const hasInvalid = selected.some(
              (item) => !parsedOptions.includes(item),
            )

            if (hasInvalid) {
              throw new BadRequestException(
                `Field "${field.label}" has invalid option`,
              )
            }
          }
        }
      }

      const invalidField = answers.find(
        (answer) => !form.fields.some((field) => field.id === answer.fieldId),
      )

      if (invalidField) {
        throw new BadRequestException(
          `fieldId ${invalidField.fieldId} does not belong to apply form`,
        )
      }
    }

    const payloadAnswers = answers.map((answer) => ({
      fieldId: answer.fieldId,
      value: answer.value.trim(),
    }))

    const applied = await this.jobRepository.applyJob({
      jobId,
      userId,
      answers: payloadAnswers,
    })

    return {
      success: true,
      data: applied,
    }
  }

  async getApplicationsByUser(userId: number) {
    const applications = await this.jobRepository.findApplicationsByUser(userId)
    return { success: true, data: applications }
  }

  async getApplicationsForEmployer(companyId: number, jobId?: number) {
    const applications = await this.jobRepository.findApplicationsForCompany(
      companyId,
      jobId,
    )
    return { success: true, data: applications }
  }

  async updateApplicationStatus(
    applicationId: number,
    companyId: number,
    status: JobApplicationStatus,
  ) {
    const application =
      await this.jobRepository.findApplicationById(applicationId)
    if (!application) {
      throw new NotFoundException('Application not found')
    }
    if (application.job.companyId !== companyId) {
      throw new BadRequestException('Unauthorized to update this application')
    }
    await this.jobRepository.updateApplicationStatus(applicationId, status)
    return { success: true }
  }

  async cancelApplyJob(jobId: number, userId: number) {
    const application = await this.jobRepository.findApplicationByJobAndUser(
      jobId,
      userId,
    )

    if (!application) {
      throw new NotFoundException('Application not found')
    }

    if (application.status === JobApplicationStatus.CANCELLED) {
      throw new BadRequestException('Application already cancelled')
    }

    if (
      application.status === JobApplicationStatus.UNSUITABLE ||
      application.status === JobApplicationStatus.SUITABLE
    ) {
      throw new BadRequestException('Cannot cancel processed application')
    }

    await this.jobRepository.cancelApply(jobId, userId)

    return {
      success: true,
    }
  }

  async getRelatedJobs(
    jobId: number,
    limit = JOB_CONSTANTS.DEFAULT_RELATED_LIMIT,
  ) {
    const currentJob = await this.jobRepository.findJobById(jobId)

    if (!currentJob) {
      throw new NotFoundException('Không tìm thấy công việc này')
    }

    const relatedJobs = await this.jobRepository.getRelatedJobs(
      jobId,
      currentJob.occupationId,
      currentJob.province,
      limit,
    )

    return relatedJobs
  }

  async getAllJobReport(
    userId: number,
    status: ReportStatus,
    page: number,
    limit: number,
  ) {
    const allJobReports = await this.jobRepository.getAllJobReport(
      userId,
      status,
      page,
      limit,
    )
    if (!allJobReports) {
      throw new NotFoundException('The job report list is empty!')
    }
    return allJobReports
  }

  async reportJob(userId: number, dto: JobReportDto) {
    const job = await this.jobRepository.findJobById(dto.jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }

    const existingReport = await this.jobRepository.findJobReport(
      userId,
      dto.jobId,
    )
    if (existingReport) {
      throw new BadRequestException('You have already reported this job')
    }

    return this.jobRepository.createJobReport(userId, dto)
  }

  async updateJobReportStatus(reportId: number, status: ReportStatus) {
    await this.jobRepository.changeJobReportStatus(reportId, status)
    return { success: true }
  }

  async getJobsByEmployer(companyId: number, query: GetJobsByEmployerDto) {
    const page = query.page || 1
    const limit = query.limit || 10
    const skip = (page - 1) * limit
    const status = query.status
    const fetchAll = query.fetchAll

    const { items, total } = await this.jobRepository.getJobsByCompanyId({
      companyId,
      status,
      limit: fetchAll ? undefined : limit,
      skip: fetchAll ? undefined : skip,
    })

    return {
      success: true,
      items,
      meta: fetchAll
        ? undefined
        : {
          page,
          limit,
          total,
          totalPage: Math.ceil(total / limit),
        },
    }
  }
  async getWarningJobs(page = 1, limit = 10) {
    const { items, total } = await this.jobRepository.getWarningJobs(
      page,
      limit,
    )
    return {
      success: true,
      items,
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
    }
  }

  async updateJobStatus(jobId: number, status: JobStatus) {
    const updated = await this.jobRepository.updateJobStatus(jobId, status)
    return { success: true, data: updated }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredJobs() {
    try {
      const result = await this.jobRepository.markExpiredJobs()
      if (result.count > 0) {
        this.logger.log(`Auto-expired ${result.count} jobs`)
      }
    } catch (error) {
      this.logger.error('Error auto-expiring jobs', error)
    }
  }
}
