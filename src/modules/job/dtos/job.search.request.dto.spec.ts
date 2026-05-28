import 'reflect-metadata'
import { JobSearchDto, JobSortBy } from './job.search.request.dto'
import { EnumShift, EnumUserGender } from 'src/generated/prisma/enums'

describe('JobSearchDto', () => {
  it('can be instantiated with all optional fields', () => {
    const dto = new JobSearchDto()
    dto.keyword = 'công nhân'
    dto.province = 'Hà Nội'
    dto.district = 'Cầu Giấy'
    dto.genderRequirement = EnumUserGender.MALE
    dto.workingShift = EnumShift.MORNING
    dto.occupationId = 2
    dto.companyId = 7
    dto.page = 1
    dto.limit = 10
    dto.sortBy = JobSortBy.NEWEST
    dto.allStatus = false
    expect(dto.keyword).toBe('công nhân')
    expect(dto.sortBy).toBe(JobSortBy.NEWEST)
    expect(dto.allStatus).toBe(false)
  })

  it('allows all fields to be undefined', () => {
    const dto = new JobSearchDto()
    expect(dto.keyword).toBeUndefined()
    expect(dto.province).toBeUndefined()
    expect(dto.page).toBeUndefined()
  })

  it('JobSortBy enum has all expected values', () => {
    expect(JobSortBy.NEWEST).toBe('newest')
    expect(JobSortBy.SALARY_DESC).toBe('salary_desc')
    expect(JobSortBy.SALARY_ASC).toBe('salary_asc')
    expect(JobSortBy.VIEW).toBe('view')
  })
})
