export interface IJobSections {
  requirements: string
  benefits: string
}

export interface IWorkerSkillProfile {
  occupation: { name: string }
  experienceYear?: number | null
  bio?: string | null
}

export interface IWorkerCultureProfile {
  desiredJobText?: string | null
}
