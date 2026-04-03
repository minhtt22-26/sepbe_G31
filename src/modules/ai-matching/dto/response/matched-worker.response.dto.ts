class WorkerDto {
  userId: number
  fullName: string
  avatar: string | null
  phone: string | null
  province: string | null
  ward: string | null
  gender: string | null
  birthYear: number | null
  expectedSalary: number | null
  shift: string | null
  experienceYear: number | null
  bio: string | null
  desiredJobText: string | null
  occupationName: string | null
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

export class MatchedWorkerResponseDto {
  worker: WorkerDto
  scores: ScoresDto
}
