import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common'
import { JobRepository } from '../repositories/job.repository'
import { CreateJobRequest } from '../dtos/request/create-job.request'
import { UpdateJobRequest } from '../dtos/request/update-job.request'
import { JobApplicationStatus, JobStatus, ReportStatus } from 'src/generated/prisma/enums'
import { ApplyJobRequest } from '../dtos/request/apply-job.request'
import { JOB_CONSTANTS } from '../constant/job.constant'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'
// import { EmbeddingQueueService } from 'src/infrastructure/queue/embedding/service/embedding-queue.service'
import { JobReportDto } from '../dtos/job.report.request.dto'

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name)

  constructor(
    private readonly jobRepository: JobRepository,
    // private readonly embeddingQueueService: EmbeddingQueueService,
    @Inject(forwardRef(() => AIMatchingService))
    private readonly aiMatchingService: AIMatchingService,
  ) { }

  async searchJobs(q: any) {
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
        ? { salaryMax: 'desc' }
        : sortBy === 'salary_asc'
          ? { salaryMax: 'asc' }
          : sortBy === 'view'
            ? { viewCount: 'desc' }
            : { createdAt: 'desc' }
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

    const jobData = {
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
      status: JobStatus.WARNING, // hoặc ACTIVE nếu không cần duyệt
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
      }
    } catch (error) {
      console.error(
        '\n\n==== PRISMA ERROR LOG ====\n',
        error.message,
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
    this.embeddingQueueService.queueJobEmbedding(jobId)
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
    const jobWithForm = await this.jobRepository.findJobWithApplyForm(jobId)

    if (!jobWithForm) {
      throw new NotFoundException('Job not found')
    }

    if (jobWithForm.status !== JobStatus.PUBLISHED) {
      throw new BadRequestException('Job is not available for apply')
    }

    const form = jobWithForm.applyForms?.[0]

    if (!form) {
      throw new BadRequestException('Apply form has not been created')
    }

    const answers = body.answers || []
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

  async updateApplicationStatus(applicationId: number, companyId: number, status: JobApplicationStatus) {
    const application = await this.jobRepository.findApplicationById(applicationId)
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

  async getAllJobReport(userId: number, status: ReportStatus, page: number, limit: number) {
    const allJobReports = await this.jobRepository.getAllJobReport(userId, status, page, limit)
    if (!allJobReports) {
      throw new NotFoundException("The job report list is empty!")
    }
    return allJobReports
  }

  async reportJob(userId: number, dto: JobReportDto) {
    const job = await this.jobRepository.findJobById(dto.jobId)

    if (!job) {
      throw new NotFoundException('Job not found')
    }

    const existingReport = await this.jobRepository.findJobReport(userId, dto.jobId)
    if (existingReport) {
      throw new BadRequestException('You have already reported this job')
    }

    const createJobReport = await this.jobRepository.createJobReport(userId, dto)
    return { success: true }
  }

  async updateJobReportStatus(reportId: number, status: ReportStatus) {
    await this.jobRepository.changeJobReportStatus(reportId, status);
    return { success: true };
  }
}
