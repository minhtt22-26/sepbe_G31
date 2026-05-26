import { Test, TestingModule } from '@nestjs/testing'
import { ScoringService } from './scoring.service'
import { ProvinceHelper } from 'src/common/helper/province.helper'
import { MatchingConfigKey } from 'src/generated/prisma/enums'
import { IMatchingConfig, IScoreComponents } from '../interfaces/ai-matching.interface'

describe('ScoringService', () => {
    let service: ScoringService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ScoringService, ProvinceHelper],
        }).compile()

        service = module.get<ScoringService>(ScoringService)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('calculateSalaryScore', () => {
        it('returns 0.5 when expectedSalary is null', () => {
            expect(service.calculateSalaryScore(null, 5000000, 10000000)).toBe(0.5)
        })

        it('returns 0.5 when both salaryMin and salaryMax are null', () => {
            expect(service.calculateSalaryScore(8000000, null, null)).toBe(0.5)
        })

        it('returns 1 when expected salary is within the range', () => {
            expect(service.calculateSalaryScore(7000000, 5000000, 10000000)).toBe(1)
        })

        it('returns 1 when expected salary equals salaryMin', () => {
            expect(service.calculateSalaryScore(5000000, 5000000, 10000000)).toBe(1)
        })

        it('returns partial score when expected salary is below minimum', () => {
            const expected = 8000000
            const min = 10000000
            const diff = min - expected
            const score = Math.max(0, 1 - diff / min)
            expect(service.calculateSalaryScore(expected, min, 15000000)).toBeCloseTo(score)
        })

        it('returns approximately 0 when expected salary is far below minimum', () => {
            expect(service.calculateSalaryScore(1, 10000000, 20000000)).toBeCloseTo(0, 5)
        })

        it('returns partial score when expected salary is above maximum', () => {
            const expected = 15000000
            const max = 10000000
            const diff = expected - max
            const score = Math.max(0, 1 - diff / expected)
            expect(service.calculateSalaryScore(expected, 5000000, max)).toBeCloseTo(score)
        })
    })

    describe('calculateLocationScore', () => {
        it('returns 0.5 when workerProvince is null', () => {
            expect(service.calculateLocationScore(null, 'Hà Nội')).toBe(0.5)
        })

        it('returns 0.5 when jobProvince is null', () => {
            expect(service.calculateLocationScore('Hà Nội', null)).toBe(0.5)
        })

        it('returns 1.0 when same province and same district', () => {
            expect(service.calculateLocationScore('Hà Nội', 'Hà Nội', 'Cầu Giấy', 'Cầu Giấy')).toBe(1.0)
        })

        it('returns 0.5 when same province but different district', () => {
            expect(service.calculateLocationScore('Hà Nội', 'Hà Nội', 'Cầu Giấy', 'Đống Đa')).toBe(0.5)
        })

        it('returns 0.5 when same province but district info is missing', () => {
            expect(service.calculateLocationScore('Hà Nội', 'Hà Nội')).toBe(0.5)
        })

        it('returns 0.2 when provinces are in the same region', () => {
            expect(service.calculateLocationScore('Hà Nội', 'Bắc Ninh')).toBe(0.2)
        })

        it('returns 0.0 when provinces are in different regions', () => {
            expect(service.calculateLocationScore('Hà Nội', 'Hồ Chí Minh')).toBe(0.0)
        })
    })

    describe('calculateGenderScore', () => {
        it('returns 1.0 when jobGenderRequirement is null', () => {
            expect(service.calculateGenderScore('MALE', null)).toBe(1.0)
        })

        it('returns 0.5 when workerGender is null and requirement exists', () => {
            expect(service.calculateGenderScore(null, 'FEMALE')).toBe(0.5)
        })

        it('returns 1.0 when worker gender matches requirement', () => {
            expect(service.calculateGenderScore('FEMALE', 'FEMALE')).toBe(1.0)
        })

        it('returns 0.0 when worker gender does not match requirement', () => {
            expect(service.calculateGenderScore('MALE', 'FEMALE')).toBe(0.0)
        })

        it('returns 1.0 when both worker gender and requirement are null', () => {
            expect(service.calculateGenderScore(null, null)).toBe(1.0)
        })
    })

    describe('calculateAgeScore', () => {
        const currentYear = new Date().getFullYear()

        it('returns 1.0 when both jobAgeMin and jobAgeMax are null', () => {
            expect(service.calculateAgeScore(1990, null, null)).toBe(1.0)
        })

        it('returns 0.5 when workerBirthYear is null and limits exist', () => {
            expect(service.calculateAgeScore(null, 20, 35)).toBe(0.5)
        })

        it('returns 1.0 when worker age is within range', () => {
            const birthYear = currentYear - 28
            expect(service.calculateAgeScore(birthYear, 20, 35)).toBe(1.0)
        })

        it('returns 0.0 when worker age is below minimum', () => {
            const birthYear = currentYear - 18
            expect(service.calculateAgeScore(birthYear, 25, 40)).toBe(0.0)
        })

        it('returns 0.0 when worker age is above maximum', () => {
            const birthYear = currentYear - 50
            expect(service.calculateAgeScore(birthYear, 20, 35)).toBe(0.0)
        })

        it('returns 1.0 when only jobAgeMin is set and worker meets it', () => {
            const birthYear = currentYear - 30
            expect(service.calculateAgeScore(birthYear, 25, null)).toBe(1.0)
        })
    })

    describe('calculateShiftScore', () => {
        it('returns 0.5 when jobShift is null', () => {
            expect(service.calculateShiftScore('MORNING', null)).toBe(0.5)
        })

        it('returns 0.5 when workerShift is null', () => {
            expect(service.calculateShiftScore(null, 'MORNING')).toBe(0.5)
        })

        it('returns 1.0 when shifts match exactly', () => {
            expect(service.calculateShiftScore('MORNING', 'MORNING')).toBe(1.0)
        })

        it('returns 1.0 when worker shift is FLEXIBLE', () => {
            expect(service.calculateShiftScore('FLEXIBLE', 'NIGHT')).toBe(1.0)
        })

        it('returns 0.0 when shifts do not match and worker is not FLEXIBLE', () => {
            expect(service.calculateShiftScore('MORNING', 'NIGHT')).toBe(0.0)
        })

        it('returns 0.5 when both shifts are null', () => {
            expect(service.calculateShiftScore(null, null)).toBe(0.5)
        })
    })

    describe('calculateFinalScore', () => {
        const configs: IMatchingConfig[] = [
            { key: MatchingConfigKey.SKILL_WEIGHT, value: 0.3 },
            { key: MatchingConfigKey.BENEFIT_WEIGHT, value: 0.1 },
            { key: MatchingConfigKey.SALARY_WEIGHT, value: 0.15 },
            { key: MatchingConfigKey.LOCATION_WEIGHT, value: 0.2 },
            { key: MatchingConfigKey.SHIFT_WEIGHT, value: 0.1 },
            { key: MatchingConfigKey.GENDER_WEIGHT, value: 0.05 },
            { key: MatchingConfigKey.AGE_WEIGHT, value: 0.1 },
        ]

        it('returns correct weighted sum rounded to 3 decimal places', () => {
            const scores: IScoreComponents = {
                skillScore: 1.0,
                benefitScore: 1.0,
                salaryScore: 1.0,
                locationScore: 1.0,
                shiftScore: 1.0,
                genderScore: 1.0,
                ageScore: 1.0,
            }
            expect(service.calculateFinalScore(scores, configs)).toBe(1.0)
        })

        it('returns 0 when all scores are 0', () => {
            const scores: IScoreComponents = {
                skillScore: 0,
                benefitScore: 0,
                salaryScore: 0,
                locationScore: 0,
                shiftScore: 0,
                genderScore: 0,
                ageScore: 0,
            }
            expect(service.calculateFinalScore(scores, configs)).toBe(0)
        })

        it('applies weights correctly for mixed scores', () => {
            const scores: IScoreComponents = {
                skillScore: 0.8,
                benefitScore: 0.6,
                salaryScore: 1.0,
                locationScore: 0.5,
                shiftScore: 1.0,
                genderScore: 1.0,
                ageScore: 0.0,
            }
            const expected = Math.round(
                (0.3 * 0.8 + 0.1 * 0.6 + 0.15 * 1.0 + 0.2 * 0.5 + 0.1 * 1.0 + 0.05 * 1.0 + 0.1 * 0.0) * 1000,
            ) / 1000
            expect(service.calculateFinalScore(scores, configs)).toBe(expected)
        })

        it('uses 0 for missing weight keys', () => {
            const partialConfigs: IMatchingConfig[] = [
                { key: MatchingConfigKey.SKILL_WEIGHT, value: 1.0 },
            ]
            const scores: IScoreComponents = {
                skillScore: 0.75,
                benefitScore: 1.0,
                salaryScore: 1.0,
                locationScore: 1.0,
                shiftScore: 1.0,
                genderScore: 1.0,
                ageScore: 1.0,
            }
            expect(service.calculateFinalScore(scores, partialConfigs)).toBe(0.75)
        })

        it('rounds result to 3 decimal places', () => {
            const fractionalConfigs: IMatchingConfig[] = [
                { key: MatchingConfigKey.SKILL_WEIGHT, value: 1 / 3 },
                { key: MatchingConfigKey.BENEFIT_WEIGHT, value: 1 / 3 },
                { key: MatchingConfigKey.SALARY_WEIGHT, value: 1 / 3 },
                { key: MatchingConfigKey.LOCATION_WEIGHT, value: 0 },
                { key: MatchingConfigKey.SHIFT_WEIGHT, value: 0 },
                { key: MatchingConfigKey.GENDER_WEIGHT, value: 0 },
                { key: MatchingConfigKey.AGE_WEIGHT, value: 0 },
            ]
            const scores: IScoreComponents = {
                skillScore: 1.0,
                benefitScore: 1.0,
                salaryScore: 1.0,
                locationScore: 0,
                shiftScore: 0,
                genderScore: 0,
                ageScore: 0,
            }
            const result = service.calculateFinalScore(scores, fractionalConfigs)
            expect(result).toBe(Math.round((1 / 3 + 1 / 3 + 1 / 3) * 1000) / 1000)
        })
    })
})
