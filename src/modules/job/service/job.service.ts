import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { JobRepository } from '../repositories/job.repository'
import { CreateJobRequest } from '../dtos/request/create-job.request'
import { UpdateJobRequest } from '../dtos/request/update-job.request'
import {
  JobApplicationStatus,
  JobStatus,
  ReportStatus,
  WalletTransactionType,
} from 'src/generated/prisma/enums'
import { ApplyJobRequest } from '../dtos/request/apply-job.request'
import { GetJobsByEmployerDto } from '../dtos/request/get-jobs-employer.dto'
import { JOB_CONSTANTS } from '../constant/job.constant'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'
// import { EmbeddingQueueService } from 'src/infrastructure/queue/embedding/service/embedding-queue.service'
import { JobReportDto } from '../dtos/job.report.request.dto'
import { BoostCheckoutRequestDto } from '../dtos/request/boost-checkout.request'
import { ConfirmBoostPaymentRequestDto } from '../dtos/request/confirm-boost-payment.request'
import { WalletService } from 'src/modules/wallet/wallet.service'

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name)
  private readonly JOB_POSTING_FEE = 50000

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
    private readonly walletService: WalletService,
    // private readonly embeddingQueueService: EmbeddingQueueService,
    @Inject(forwardRef(() => AIMatchingService))
    private readonly aiMatchingService: AIMatchingService,
  ) {}

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

  async getBoostPackages() {
    const items = await this.walletService.getBoostPackagesForEmployer()

    return {
      success: true,
      items,
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

    const selectedPackage = await this.walletService.resolveBoostPackage(
      body?.packageDays,
    )
    const packageDays = Math.max(1, Number(selectedPackage.durationDays || 1))
    const pointCost = Math.max(0, Number(selectedPackage.price || 0))

    await this.walletService.deductPoints({
      companyId,
      cost: pointCost,
      type: WalletTransactionType.BOOST_JOB,
      referenceType: 'JOB',
      referenceId: jobId,
      metadata: {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        packageDays,
      },
    })
    const result = await this.jobRepository.activateBoostByPoint({
      jobId,
      durationDays: packageDays,
    })

    return {
      success: true,
      data: {
        jobId: result.id,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        packageDays,
        pointCost,
        boostExpiredAt: result.boostExpiredAt,
      },
      message: 'Đã trừ point và kích hoạt boost cho tin tuyển dụng.',
    }
  }

  async createJobPostingCheckout(jobId: number, companyId: number) {
    const job = await this.jobRepository.findJobById(jobId)
    if (!job || job.companyId !== companyId) {
      throw new NotFoundException('Job not found or unauthorized')
    }

    if (job.status === JobStatus.PUBLISHED) {
      throw new BadRequestException('Job has already been published')
    }

    const pointCost = await this.walletService.getPointCost(
      'JOB_POST_POINT_COST',
      this.JOB_POSTING_FEE,
    )
    await this.walletService.deductPoints({
      companyId,
      cost: pointCost,
      type: WalletTransactionType.POST_JOB,
      referenceType: 'JOB',
      referenceId: jobId,
    })
    const published = await this.jobRepository.publishJobByPoint(jobId)
    await this.aiMatchingService.buildJobEmbedding(jobId)

    return {
      success: true,
      data: {
        jobId: published.id,
        pointCost,
      },
      message: 'Đã trừ point và xuất bản tin tuyển dụng.',
    }
  }

  async handleSepayWebhook(
    authorizationHeader?: string,
    payload?: Record<string, unknown>,
  ) {
    this.logger.warn(
      `Đã ngưng webhook SePay cho job/boost. Dùng point-only. authorization=${Boolean(
        authorizationHeader,
      )}, payload=${Boolean(payload)}`,
    )
    return {
      success: true,
      message:
        'Luồng webhook SePay cho job/boost đã ngưng. Hệ thống hiện thanh toán bằng point.',
    }
  }

  async confirmBoostPayment(
    jobId: number,
    companyId: number,
    body: ConfirmBoostPaymentRequestDto,
  ) {
    void body
    const job = await this.jobRepository.findJobById(jobId)
    if (!job || job.companyId !== companyId) {
      throw new NotFoundException('Job not found or unauthorized')
    }

    return {
      success: false,
      message:
        'Endpoint xác nhận payment boost đã ngưng trong chế độ point-only. Hãy dùng thao tác boost bằng point.',
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
      status: JobStatus.WARNING,
    }

    try {
      const created = await this.jobRepository.createJobWithForm({
        jobData,
        fields: dto.fields,
      })
      const freePostingAvailable = await this.jobRepository.isFirstJobPostFree(
        companyId,
      )

      if (freePostingAvailable) {
        await this.jobRepository.publishFirstJobForFree(created.id, companyId)
        await this.aiMatchingService.buildJobEmbedding(created.id)
        return {
          success: true,
          data: {
            job: {
              ...created,
              status: JobStatus.PUBLISHED,
            },
            payment: {
              pointCost: 0,
            },
          },
          message: 'Đã đăng tin miễn phí cho lần đầu tiên của doanh nghiệp.',
        }
      }

      const pointCost = await this.walletService.getPointCost(
        'JOB_POST_POINT_COST',
        this.JOB_POSTING_FEE,
      )
      await this.walletService.deductPoints({
        companyId,
        cost: pointCost,
        type: WalletTransactionType.POST_JOB,
        referenceType: 'JOB',
        referenceId: created.id,
      })
      await this.jobRepository.publishJobByPoint(created.id)
      await this.aiMatchingService.buildJobEmbedding(created.id)

      return {
        success: true,
        data: {
          job: created,
          payment: {
            pointCost,
          },
        },
        message: 'Đã tạo và xuất bản tin bằng point thành công.',
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

    await this.aiMatchingService.buildJobEmbedding(jobId)

    return update
  }

  async getDetail(jobId: number, ipAddress?: string) {
    const job = await this.jobRepository.findJobById(jobId)

    if (!job) {
      throw new Error('Job not found')
    }

    if (ipAddress) {
      Promise.resolve(this.jobRepository.recordView(jobId, ipAddress)).catch((err) => {
        this.logger.warn(`Failed to record view for job ${jobId}: ${err}`)
      })
    }

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
