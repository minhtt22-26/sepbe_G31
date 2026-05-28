import 'reflect-metadata'
import { JobRatingDto, UpdateJobRatingDto } from './job.rating.dto'

describe('JobRatingDto', () => {
  it('can be instantiated with required rating', () => {
    const dto = new JobRatingDto()
    dto.rating = 5
    expect(dto.rating).toBe(5)
  })

  it('supports all optional fields', () => {
    const dto = new JobRatingDto()
    dto.rating = 4
    dto.title = 'Good company'
    dto.content = 'Nice environment'
    dto.salaryRating = 4
    dto.environmentRating = 5
    dto.overtimeRating = 3
    dto.managementRating = 4
    dto.isAnonymous = true
    expect(dto.isAnonymous).toBe(true)
  })

  it('UpdateJobRatingDto is a partial of JobRatingDto', () => {
    const dto = new UpdateJobRatingDto()
    dto.rating = 3
    expect(dto.rating).toBe(3)
  })
})
