import 'reflect-metadata'
import { ReportReviewDto } from './report.review.dto'
import { ReportReason } from 'src/generated/prisma/enums'

describe('ReportReviewDto', () => {
  it('can be instantiated with reason only', () => {
    const dto = new ReportReviewDto()
    dto.reason = ReportReason.INAPPROPRIATE_CONTENT
    expect(dto.reason).toBe(ReportReason.INAPPROPRIATE_CONTENT)
    expect(dto.description).toBeUndefined()
  })

  it('supports optional description', () => {
    const dto = new ReportReviewDto()
    dto.reason = ReportReason.FRAUD
    dto.description = 'This review contains false information'
    expect(dto.description).toBe('This review contains false information')
  })
})
