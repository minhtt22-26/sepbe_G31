import { Injectable } from '@nestjs/common'
import {
  IMatchingWeight,
  IScoreComponents,
} from '../interfaces/ai-matching.interface'
import { ProvinceHelper } from 'src/common/helper/province.helper'

@Injectable()
export class ScoringService {
  constructor(private readonly provinceHelper: ProvinceHelper) {}

  calculateSalaryScore(
    expectedSalary: number | null,
    salaryMin: number | null,
    salaryMax: number | null,
  ): number {
    //Từ 0-1 0.5 trung lập
    if (expectedSalary == null || (salaryMax == null && salaryMin == null)) {
      return 0.5
    }

    if (
      (salaryMin == null || expectedSalary >= salaryMin) &&
      (salaryMax == null || expectedSalary <= salaryMax)
    ) {
      return 1
    }

    //Mong muốn thấp hơn tối thiểu
    if (salaryMin != null && expectedSalary < salaryMin) {
      const diff = salaryMin - expectedSalary
      return Math.max(0, 1 - diff / salaryMin)
    }

    //Mong muốn cao hơn tối đa
    if (salaryMax != null && expectedSalary > salaryMax) {
      const diff = expectedSalary - salaryMax
      return Math.max(0, 1 - diff / expectedSalary)
    }

    return 0.5
  }

  calculateLocationScore(
    workerProvince: string | null,
    jobProvince: string | null,
    workerWard: string | null = null,
    jobDistrict: string | null = null,
  ): number {
    if (workerProvince == null || jobProvince == null) {
      return 0.5
    }

    const provinceScore = this.provinceHelper.calculateProvinceProximity(
      workerProvince,
      jobProvince,
    )

    if (provinceScore === 1.0) {
      // Cùng tỉnh, check đến quận/huyện
      if (
        workerWard != null &&
        jobDistrict != null &&
        workerWard === jobDistrict
      ) {
        return 1.0
      }
      return 0.5 // Khác quận/huyện nhưng cùng tỉnh
    }

    // Khác tỉnh nhưng có thể cùng vùng (trả về 0.2 hoặc 0.0 từ helper)
    return provinceScore
  }

  calculateGenderScore(
    workerGender: string | null,
    jobGenderRequirement: string | null,
  ): number {
    if (!jobGenderRequirement) {
      return 1.0
    }
    if (!workerGender) {
      return 0.5
    }
    return workerGender === jobGenderRequirement ? 1.0 : 0.0
  }

  calculateAgeScore(
    workerBirthYear: number | null,
    jobAgeMin: number | null,
    jobAgeMax: number | null,
  ): number {
    if (jobAgeMin == null && jobAgeMax == null) {
      return 1.0
    }
    if (workerBirthYear == null) {
      return 0.5
    }

    const currentYear = new Date().getFullYear()
    const workerAge = currentYear - workerBirthYear

    if (
      (jobAgeMin == null || workerAge >= jobAgeMin) &&
      (jobAgeMax == null || workerAge <= jobAgeMax)
    ) {
      return 1.0
    }

    return 0.0
  }

  calculateShiftScore(
    workerShift: string | null,
    jobShift: string | null,
  ): number {
    if (jobShift == null || workerShift == null) {
      return 0.5
    }
    if (workerShift === 'FLEXIBLE' || workerShift === jobShift) {
      return 1.0
    }
    return 0.0
  }

  calculateFinalScore(
    scores: IScoreComponents,
    weights: IMatchingWeight[],
  ): number {
    const weightMap = new Map(weights.map((w) => [w.key, w.weight]))

    const result =
      (weightMap.get('SKILL_WEIGHT') ?? 0) * scores.skillScore +
      (weightMap.get('BENEFIT_WEIGHT') ?? 0) * scores.benefitScore +
      (weightMap.get('SALARY_WEIGHT') ?? 0) * scores.salaryScore +
      (weightMap.get('LOCATION_WEIGHT') ?? 0) * scores.locationScore +
      (weightMap.get('SHIFT_WEIGHT') ?? 0) * scores.shiftScore +
      (weightMap.get('GENDER_WEIGHT') ?? 0) * scores.genderScore +
      (weightMap.get('AGE_WEIGHT') ?? 0) * scores.ageScore

    return Math.round(result * 1000) / 1000
  }
}
