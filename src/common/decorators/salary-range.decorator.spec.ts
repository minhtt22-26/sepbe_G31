import { SalaryRangeConstraint } from './salary-range.decorator'

describe('SalaryRangeConstraint', () => {
  let constraint: SalaryRangeConstraint

  beforeEach(() => {
    constraint = new SalaryRangeConstraint()
  })

  it('returns true when min <= max', () => {
    const args: any = { object: { expectedSalaryMin: 5000000, expectedSalaryMax: 10000000 } }
    expect(constraint.validate(null, args)).toBe(true)
  })

  it('returns false when min > max', () => {
    const args: any = { object: { expectedSalaryMin: 15000000, expectedSalaryMax: 10000000 } }
    expect(constraint.validate(null, args)).toBe(false)
  })

  it('returns true when only one salary field is defined', () => {
    const args: any = { object: { expectedSalaryMin: 5000000 } }
    expect(constraint.validate(null, args)).toBe(true)
  })

  it('returns true when neither field is defined', () => {
    const args: any = { object: {} }
    expect(constraint.validate(null, args)).toBe(true)
  })

  it('defaultMessage returns Vietnamese error message', () => {
    expect(constraint.defaultMessage()).toContain('Lương')
  })
})
