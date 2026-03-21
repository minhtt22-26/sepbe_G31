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
import { JobService } from 'src/modules/job/service/job.service'
import { EmbeddingService } from 'src/modules/embedding/service/embedding.service'
import { EmbeddingTextBuilder } from 'src/modules/embedding/builder/embedding-text.builder'

@Injectable()
export class AIMatchingService {
  private readonly DEFAULT_LIMIT = 20
  private readonly MAX_LIMIT = 100

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

    const weights = await this.aiMatchingRepository.getWeights()

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

      const finalScore = this.scoringService.calculateFinalScore(
        {
          skillScore: job.skillScore,
          benefitScore: job.benefitScore,
          salaryScore,
          locationScore,
          shiftScore,
          genderScore,
          ageScore,
        },
        weights,
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
}
