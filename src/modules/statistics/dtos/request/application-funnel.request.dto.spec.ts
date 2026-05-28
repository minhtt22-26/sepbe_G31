import 'reflect-metadata'
import { ApplicationFunnelRequestDto } from './application-funnel.request.dto'

describe('ApplicationFunnelRequestDto', () => {
  it('can be instantiated with all optional fields', () => {
    const dto = new ApplicationFunnelRequestDto()
    dto.jobId = 1
    dto.from = '2025-01-01'
    dto.to = '2025-12-31'
    expect(dto.jobId).toBe(1)
    expect(dto.from).toBe('2025-01-01')
  })

  it('allows all fields to be undefined', () => {
    const dto = new ApplicationFunnelRequestDto()
    expect(dto.jobId).toBeUndefined()
    expect(dto.from).toBeUndefined()
    expect(dto.to).toBeUndefined()
  })
})
