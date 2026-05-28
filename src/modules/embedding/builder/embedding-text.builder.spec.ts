import { Test, TestingModule } from '@nestjs/testing'
import { EmbeddingTextBuilder } from './embedding-text.builder'

describe('EmbeddingTextBuilder', () => {
  let builder: EmbeddingTextBuilder

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingTextBuilder],
    }).compile()
    builder = module.get<EmbeddingTextBuilder>(EmbeddingTextBuilder)
  })

  // ── buildSkillText ────────────────────────────────────────────────────────

  describe('buildSkillText', () => {
    it('includes occupation name', () => {
      const result = builder.buildSkillText({
        occupation: { id: 1, name: 'Công nhân may' } as any,
        experienceYear: null,
        bio: null,
      })
      expect(result).toBe('Công nhân may')
    })

    it('includes experience years when provided', () => {
      const result = builder.buildSkillText({
        occupation: { id: 1, name: 'Kế toán' } as any,
        experienceYear: 3,
        bio: null,
      })
      expect(result).toContain('3 năm kinh nghiệm')
      expect(result).toContain('Kế toán')
    })

    it('includes bio when provided', () => {
      const result = builder.buildSkillText({
        occupation: { id: 1, name: 'Dev' } as any,
        experienceYear: null,
        bio: 'Biết ReactJS và NestJS',
      })
      expect(result).toContain('Biết ReactJS và NestJS')
    })

    it('separates parts with pipe', () => {
      const result = builder.buildSkillText({
        occupation: { id: 1, name: 'Dev' } as any,
        experienceYear: 2,
        bio: 'bio text',
      })
      const parts = result.split(' | ')
      expect(parts).toHaveLength(3)
    })

    it('trims empty bio', () => {
      const result = builder.buildSkillText({
        occupation: { id: 1, name: 'Dev' } as any,
        experienceYear: null,
        bio: '   ',
      })
      expect(result).toBe('Dev')
    })
  })

  // ── buildCultureText ──────────────────────────────────────────────────────

  describe('buildCultureText', () => {
    it('returns desiredJobText when set', () => {
      const result = builder.buildCultureText({ desiredJobText: 'Môi trường thoải mái' })
      expect(result).toBe('Môi trường thoải mái')
    })

    it('returns empty string when desiredJobText is null', () => {
      const result = builder.buildCultureText({ desiredJobText: null })
      expect(result).toBe('')
    })

    it('trims whitespace from desiredJobText', () => {
      const result = builder.buildCultureText({ desiredJobText: '  thoải mái  ' })
      expect(result).toBe('thoải mái')
    })
  })

  // ── buildJobReqText ───────────────────────────────────────────────────────

  describe('buildJobReqText', () => {
    it('includes occupation name and requirements', () => {
      const result = builder.buildJobReqText(
        { requirements: 'Biết NestJS', benefits: 'Cơm miễn phí' },
        'Lập trình viên',
      )
      expect(result).toContain('Lập trình viên')
      expect(result).toContain('Biết NestJS')
    })

    it('returns only occupation name when requirements empty', () => {
      const result = builder.buildJobReqText(
        { requirements: '   ', benefits: '' },
        'Designer',
      )
      expect(result).toBe('Designer')
    })
  })

  // ── buildJobBenefitText ───────────────────────────────────────────────────

  describe('buildJobBenefitText', () => {
    it('returns trimmed benefits text', () => {
      const result = builder.buildJobBenefitText({
        requirements: '',
        benefits: '  Bảo hiểm đầy đủ  ',
      })
      expect(result).toBe('Bảo hiểm đầy đủ')
    })

    it('returns empty string when benefits is empty', () => {
      const result = builder.buildJobBenefitText({ requirements: '', benefits: '' })
      expect(result).toBe('')
    })
  })
})
