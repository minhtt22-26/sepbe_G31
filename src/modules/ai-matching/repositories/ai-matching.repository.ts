import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import {
  IMatchingWeight,
  IRawMatchedJob,
  IWorkerEmbeddings,
} from '../interfaces/ai-matching.interface'

@Injectable()
export class AIMatchingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMatchedJobs(
    skillEmbedding: number[],
    cultureEmbedding: number[],
    limit: number,
  ): Promise<IRawMatchedJob[]> {
    const fetchLimit = limit * 3

    const skillVector = `[${skillEmbedding.join(',')}]`
    const cultureVector = cultureEmbedding
      ? `[${cultureEmbedding.join(',')}]`
      : null

    const result = await this.prisma.$queryRawUnsafe<IRawMatchedJob[]>(
      `
        SELECT 
        j.id,
        j.title,
        j.description,
        j.quantity,
        j.province,
        j.district,
        j."salaryMax",
        j."salaryMin",
        j."workingShift",
        j."genderRequirement",
        j."ageMin",
        j."ageMax",
        j."isBoosted",
        j."expiredAt",
        j."occupationId",
        o.name AS "occupationName",
        c.id AS "companyId",
        c.name AS "companyName",
        c."logoUrl",
        1 - (j."reqEmbedding" <=> $1::vector) AS "skillScore",
            CASE
                WHEN j."benefitEmbedding" IS NOT NULL AND $2::vector IS NOT NULL
                THEN 1 - (j."benefitEmbedding" <=> $2::vector)
                ELSE 0
            END AS "benefitScore"
        FROM "Job" j 
        JOIN "Occupation" o ON o.id = j."occupationId"
        JOIN "Company" c ON c.id = j."companyId"
        WHERE j.status = 'PUBLISHED' 
            AND (j."expiredAt" IS NULL OR j."expiredAt" > NOW()) 
            AND j."reqEmbedding" IS NOT NULL
            ORDER BY (j."reqEmbedding" <=> $1::vector) + (CASE WHEN j."benefitEmbedding" IS NOT NULL AND $2::vector IS NOT NULL THEN j."benefitEmbedding" <=> $2::vector ELSE 1 END)
            LIMIT $3  
        `,
      skillVector,
      cultureVector,
      fetchLimit,
    )

    return result
  }

  async getWeights(): Promise<IMatchingWeight[]> {
    return this.prisma.matchingWeight.findMany()
  }

  async updateWeights(weights: IMatchingWeight[]): Promise<IMatchingWeight[]> {
    await this.prisma.$transaction(
      weights.map(({ key, weight }) =>
        this.prisma.matchingWeight.update({
          where: { key },
          data: { weight },
        }),
      ),
    )

    return this.getWeights()
  }

  private parseVector(text: string | null): number[] | null {
    if (!text) return null
    return text
      .replace('[', '')
      .replace(']', '')
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n))
  }

  async getWorkerEmbeddings(userId: number): Promise<IWorkerEmbeddings | null> {
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        skillEmbedding: string | null
        cultureEmbedding: string | null
      }>
    >(
      `
      SELECT 
      "skillEmbedding"::text AS "skillEmbedding",
      "cultureEmbedding"::text AS "cultureEmbedding"
      FROM "WorkerProfile"
      WHERE "userId" = $1
      LIMIT 1
      `,
      userId,
    )

    const row = rows[0]
    if (!row?.skillEmbedding) {
      return null
    }

    const skill = this.parseVector(row.skillEmbedding)
    if (!skill?.length) {
      return null
    }

    const culture = this.parseVector(row.cultureEmbedding)

    return {
      skillEmbedding: skill,
      cultureEmbedding: culture,
    }
  }

  async updateWorkerEmbeddings(
    userId: number,
    skillEmbedding: number[],
    cultureEmbedding: number[] | null,
  ): Promise<void> {
    const skillVector = `[${skillEmbedding.join(',')}]`
    const cultureVector = cultureEmbedding
      ? `[${cultureEmbedding.join(',')}]`
      : null

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE "WorkerProfile"
      SET
        "skillEmbedding" = $1::vector,
        "cultureEmbedding" = CASE WHEN $2::text IS NULL THEN NULL ELSE $2::text::vector END,
        "embeddingUpdatedAt" = NOW()
      WHERE "userId" = $3
      `,
      skillVector,
      cultureVector,
      userId,
    )
  }

  async updateJobEmbeddings(
    jobId: number,
    reqEmbedding: number[],
    benefitEmbedding: number[] | null,
  ): Promise<void> {
    const reqVector = `[${reqEmbedding.join(',')}]`
    const benefitVector = benefitEmbedding
      ? `[${benefitEmbedding.join(',')}]`
      : null

    await this.prisma.$executeRawUnsafe(
      `
        UPDATE "Job"
        SET
          "reqEmbedding" = $1::vector,
          "benefitEmbedding" = CASE WHEN $2::text IS NULL THEN NULL ELSE $2::text::vector END,
          "embeddingUpdatedAt" = NOW()
        WHERE id = $3
          `,
      reqVector,
      benefitVector,
      jobId,
    )
  }
}
