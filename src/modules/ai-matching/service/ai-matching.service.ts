import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AIMatchingRepository } from '../repositories/ai-matching.repository'
import { ScoringService } from './scoring.service'
import { UserService } from 'src/modules/users/service/user.service'
import { MatchedJobResponseDto } from '../dto/response/matched-job.response.dto'
import { MatchedWorkerResponseDto } from '../dto/response/matched-worker.response.dto'
import { JobService } from 'src/modules/job/service/job.service'
import { EmbeddingService } from 'src/modules/embedding/service/embedding.service'
import { EmbeddingTextBuilder } from 'src/modules/embedding/builder/embedding-text.builder'
import { IMatchingConfig } from '../interfaces/ai-matching.interface'

@Injectable()
export class AIMatchingService {
  private readonly DEFAULT_LIMIT = 20
  private readonly MAX_LIMIT = 100
  private readonly DEFAULT_MIN_SCORE_THRESHOLD = 0

  constructor(
    @Inject(forwardRef(() => JobService))
    private readonly jobService: JobService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly scoringService: ScoringService,
    private readonly embeddingService: EmbeddingService,
    private readonly aiMatchingRepository: AIMatchingRepository,
    private readonly embeddingTextBuilder: EmbeddingTextBuilder,
  ) {}

  private getMinScoreThreshold(configs: IMatchingConfig[]): number {
    const thresholdConfig = configs.find(
      (c) => c.key === 'MIN_SCORE_THRESHOLD',
    )
    return thresholdConfig?.value ?? this.DEFAULT_MIN_SCORE_THRESHOLD
  }

  async getMatchedJobs(
    userId: number,
    limit?: number,
  ): Promise<MatchedJobResponseDto[]> {
    const resolvedLimit = Math.min(limit ?? this.DEFAULT_LIMIT, this.MAX_LIMIT)

    const workerProfile = await this.userService.getWorkerProfile(userId)
    const embeddings =
      await this.aiMatchingRepository.getWorkerEmbeddings(userId)

    if (!workerProfile) {
      throw new NotFoundException('Worker profile không tồn tại')
    }

    if (!embeddings?.skillEmbedding.length) {
      throw new BadRequestException(
        'Worker profile chưa được xử lý embedding. Vui lòng cập nhật profile.',
      )
    }

    const configs = await this.aiMatchingRepository.getConfigs()
    const minScoreThreshold = this.getMinScoreThreshold(configs)

    const rawJobs = await this.aiMatchingRepository.findMatchedJobs(
      embeddings.skillEmbedding,
      embeddings.cultureEmbedding as number[],
      resolvedLimit,
    )

    const results = rawJobs.map((job) => {
      const salaryScore = this.scoringService.calculateSalaryScore(
        workerProfile.expectedSalary,
        job.salaryMin,
        job.salaryMax,
      )

      const locationScore = this.scoringService.calculateLocationScore(
        workerProfile.province,
        job.province,
        workerProfile.ward,
        job.district,
      )

      const shiftScore = this.scoringService.calculateShiftScore(
        workerProfile.shift,
        job.workingShift,
      )

      const genderScore = this.scoringService.calculateGenderScore(
        workerProfile.gender,
        job.genderRequirement,
      )

      const ageScore = this.scoringService.calculateAgeScore(
        workerProfile.birthYear,
        job.ageMin,
        job.ageMax,
      )

      const isSameOccupation = workerProfile.occupationId === job.occupationId

      // Nếu cùng ngành nghề, skillScore nằm trong khoảng 0.8 - 1.0 (ưu tiên cao nhất)
      // Nếu khác ngành nghề, skillScore nằm trong khoảng 0.0 - 0.5 (giảm độ ưu tiên)
      const refinedSkillScore = isSameOccupation
        ? 0.8 + job.skillScore * 0.2
        : job.skillScore * 0.5

      const finalScore = this.scoringService.calculateFinalScore(
        {
          skillScore: refinedSkillScore,
          benefitScore: job.benefitScore,
          salaryScore,
          locationScore,
          shiftScore,
          genderScore,
          ageScore,
        },
        configs,
      )

      return {
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          quantity: job.quantity,
          province: job.province,
          district: job.district,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          workingShift: job.workingShift,
          isBoosted: job.isBoosted,
          expiredAt: job.expiredAt,
        },
        company: {
          id: job.companyId,
          name: job.companyName,
          logoUrl: job.logoUrl,
        },
        occupationName: job.occupationName,
        scores: {
          skillScore: job.skillScore,
          benefitScore: job.benefitScore,
          salaryScore,
          locationScore,
          shiftScore,
          genderScore,
          ageScore,
          finalScore,
        },
      }
    })

    return results
      .filter((r) => r.scores.finalScore >= minScoreThreshold)
      .sort((a, b) => b.scores.finalScore - a.scores.finalScore)
      .slice(0, resolvedLimit)
  }

  async buildJobEmbedding(jobId: number): Promise<void> {
    const job = await this.jobService.getDetail(jobId)

    if (!job) {
      throw new NotFoundException('Job không tồn tại')
    }

    const sections = await this.embeddingService.extractJobSections(
      job.description,
    )

    const reqText = this.embeddingTextBuilder.buildJobReqText(
      sections,
      job.occupation.name,
    )

    const benefitText = this.embeddingTextBuilder.buildJobBenefitText(sections)

    const [reqEmbedding, benefitEmbedding] = await Promise.all([
      this.embeddingService.generateEmbedding(reqText),
      benefitText
        ? this.embeddingService.generateEmbedding(benefitText)
        : Promise.resolve(null),
    ])

    await this.aiMatchingRepository.updateJobEmbeddings(
      jobId,
      reqEmbedding,
      benefitEmbedding,
    )
  }

  async buildWorkerProfileEmbedding(userId: number): Promise<void> {
    const profile = await this.userService.getWorkerProfile(userId)

    if (!profile) {
      throw new NotFoundException('Worker profile không tồn tại')
    }

    if (!profile.occupation) {
      throw new BadRequestException('Worker profile thiếu occupation')
    }

    const skillText = this.embeddingTextBuilder.buildSkillText({
      occupation: profile.occupation,
      experienceYear: profile.experienceYear,
      bio: profile.bio,
    })

    const cultureText = this.embeddingTextBuilder.buildCultureText({
      desiredJobText: profile.desiredJobText,
    })

    const [skillEmbedding, cultureEmbedding] = await Promise.all([
      this.embeddingService.generateEmbedding(skillText),
      cultureText
        ? this.embeddingService.generateEmbedding(cultureText)
        : Promise.resolve(null),
    ])

    await this.aiMatchingRepository.updateWorkerEmbeddings(
      userId,
      skillEmbedding,
      cultureEmbedding,
    )
  }

  async getSuggestedWorkers(
    jobId: number,
    limit?: number,
  ): Promise<MatchedWorkerResponseDto[]> {
    const resolvedLimit = Math.min(limit ?? this.DEFAULT_LIMIT, this.MAX_LIMIT)

    const job = await this.jobService.getDetail(jobId)
    if (!job) {
      throw new NotFoundException('Job không tồn tại')
    }

    const embeddings = await this.aiMatchingRepository.getJobEmbeddings(jobId)
    if (!embeddings?.reqEmbedding.length) {
      throw new BadRequestException(
        'Job chưa được xử lý embedding. Vui lòng cập nhật mô tả công việc.',
      )
    }

    const configs = await this.aiMatchingRepository.getConfigs()
    const minScoreThreshold = this.getMinScoreThreshold(configs)

    const rawWorkers = await this.aiMatchingRepository.findMatchedWorkers(
      embeddings.reqEmbedding,
      embeddings.benefitEmbedding,
      resolvedLimit,
    )

    const results = rawWorkers.map((worker) => {
      const salaryScore = this.scoringService.calculateSalaryScore(
        worker.expectedSalary,
        job.salaryMin,
        job.salaryMax,
      )

      const locationScore = this.scoringService.calculateLocationScore(
        worker.province,
        job.province,
        worker.ward,
        job.district,
      )

      const shiftScore = this.scoringService.calculateShiftScore(
        worker.shift,
        job.workingShift,
      )

      const genderScore = this.scoringService.calculateGenderScore(
        worker.gender,
        job.genderRequirement,
      )

      const ageScore = this.scoringService.calculateAgeScore(
        worker.birthYear,
        job.ageMin,
        job.ageMax,
      )

      const isSameOccupation = worker.occupationId === job.occupationId
      const refinedSkillScore = isSameOccupation
        ? 0.8 + worker.skillScore * 0.2
        : worker.skillScore * 0.5

      const finalScore = this.scoringService.calculateFinalScore(
        {
          skillScore: refinedSkillScore,
          benefitScore: worker.cultureScore,
          salaryScore,
          locationScore,
          shiftScore,
          genderScore,
          ageScore,
        },
        configs,
      )

      return {
        worker: {
          userId: worker.userId,
          fullName: worker.fullName,
          avatar: worker.avatar,
          phone: worker.phone,
          province: worker.province,
          ward: worker.ward,
          gender: worker.gender,
          birthYear: worker.birthYear,
          expectedSalary: worker.expectedSalary,
          shift: worker.shift,
          experienceYear: worker.experienceYear,
          bio: worker.bio,
          desiredJobText: worker.desiredJobText,
          occupationName: worker.occupationName,
        },
        scores: {
          skillScore: worker.skillScore,
          benefitScore: worker.cultureScore,
          salaryScore,
          locationScore,
          shiftScore,
          genderScore,
          ageScore,
          finalScore,
        },
      }
    })

    return results
      .filter((r) => r.scores.finalScore >= minScoreThreshold)
      .sort((a, b) => b.scores.finalScore - a.scores.finalScore)
      .slice(0, resolvedLimit)
  }

  async getConfigs(): Promise<IMatchingConfig[]> {
    return this.aiMatchingRepository.getConfigs()
  }

  async updateConfigs(configs: IMatchingConfig[]): Promise<IMatchingConfig[]> {
    const weightConfigs = configs.filter(
      (c) => c.key !== 'MIN_SCORE_THRESHOLD',
    )

    if (weightConfigs.length > 0) {
      const totalWeight = weightConfigs.reduce(
        (sum, item) => sum + item.value,
        0,
      )

      if (Math.abs(totalWeight - 1) > 0.0001) {
        throw new BadRequestException(
          'Tổng các trọng số phải chính xác bằng 1',
        )
      }
    }

    const thresholdConfig = configs.find(
      (c) => c.key === 'MIN_SCORE_THRESHOLD',
    )

    if (thresholdConfig && (thresholdConfig.value < 0 || thresholdConfig.value > 1)) {
      throw new BadRequestException(
        'Ngưỡng điểm tối thiểu phải nằm trong khoảng 0 - 1 (tương ứng 0% - 100%)',
      )
    }

    return this.aiMatchingRepository.updateConfigs(configs)
  }
}
