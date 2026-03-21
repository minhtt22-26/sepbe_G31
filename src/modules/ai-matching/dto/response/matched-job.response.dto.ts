class JobDto {
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
}

class CompanyDto {
  id: number
  name: string
  logoUrl: string | null
}

class ScoresDto {
  skillScore: number
  benefitScore: number
  salaryScore: number
  locationScore: number
  shiftScore: number
  genderScore: number
  ageScore: number
  finalScore: number
}

export class MatchedJobResponseDto {
  job: JobDto
  company: CompanyDto
  occupationName: string
  scores: ScoresDto
}
