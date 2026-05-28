import 'reflect-metadata'
import { CreateJobRequest } from './create-job.request'
import { EnumShift, EnumUserGender } from 'src/generated/prisma/enums'

describe('CreateJobRequest', () => {
  it('can be instantiated with required fields', () => {
    const dto = new CreateJobRequest()
    dto.title = 'Công nhân may'
    dto.description = 'Mô tả công việc'
    dto.occupationId = 1
    dto.workingShift = EnumShift.MORNING
    dto.quantity = 5
    expect(dto.title).toBe('Công nhân may')
    expect(dto.workingShift).toBe(EnumShift.MORNING)
    expect(dto.quantity).toBe(5)
  })

  it('supports all optional fields', () => {
    const dto = new CreateJobRequest()
    dto.title = 'Dev'
    dto.description = 'desc'
    dto.occupationId = 1
    dto.workingShift = EnumShift.FULL_DAY
    dto.quantity = 2
    dto.genderRequirement = EnumUserGender.FEMALE
    dto.address = '123 ABC St'
    dto.province = 'TP.HCM'
    dto.district = 'Q1'
    dto.ageMin = 18
    dto.ageMax = 35
    dto.salaryMin = 5000000
    dto.salaryMax = 10000000
    dto.expiredAt = '2026-12-31T23:59:59.000Z'
    dto.fields = []
    expect(dto.genderRequirement).toBe(EnumUserGender.FEMALE)
    expect(dto.salaryMax).toBe(10000000)
    expect(dto.fields).toHaveLength(0)
  })
})
