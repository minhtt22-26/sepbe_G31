import { MatchingWeightKey } from 'src/generated/prisma/enums'

export interface IRawMatchedJob {
  id: number
  title: string
  description: string
  quantity: number
  province: string | null
  district: string | null
  salaryMin: number | null
  salaryMax: number | null
  workingShift: string | null
  isBoosted: boolean
  expiredAt: Date | null
  occupationId: number
  occupationName: string
  companyId: number
  companyName: string
  logoUrl: string | null
  genderRequirement: string | null
  ageMin: number | null
  ageMax: number | null
  skillScore: number
  benefitScore: number
}

export interface IMatchingWeight {
  key: MatchingWeightKey
  weight: number
}

export interface IScoreComponents {
  skillScore: number
  benefitScore: number
  salaryScore: number
  locationScore: number
  shiftScore: number
  genderScore: number
  ageScore: number
}

export interface IWorkerEmbeddings {
  skillEmbedding: number[]
  cultureEmbedding: number[] | null
}
