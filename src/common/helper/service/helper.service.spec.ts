import { Test, TestingModule } from '@nestjs/testing'
import { HelperService } from './helper.service'

describe('HelperService', () => {
  let service: HelperService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelperService],
    }).compile()
    service = module.get<HelperService>(HelperService)
  })

  describe('dateCreate', () => {
    it('returns a Date close to now', () => {
      const before = Date.now()
      const d = service.dateCreate()
      expect(d.getTime()).toBeGreaterThanOrEqual(before)
    })
  })

  describe('dateForward', () => {
    it('adds seconds to a date', () => {
      const base = new Date('2025-01-01T00:00:00Z')
      const result = service.dateForward(base, { seconds: 60 })
      expect(result.getTime()).toBe(base.getTime() + 60000)
    })
  })

  describe('dateCreateDuration', () => {
    it('returns the same options object', () => {
      expect(service.dateCreateDuration({ seconds: 300 })).toEqual({ seconds: 300 })
    })
  })

  describe('dateCreateFromTimestamp', () => {
    it('creates date from millisecond timestamp', () => {
      const ts = new Date('2025-06-01').getTime()
      expect(service.dateCreateFromTimestamp(ts).toISOString()).toBe(new Date(ts).toISOString())
    })
  })

  describe('dateDriff', () => {
    it('returns correct difference in seconds and milliseconds', () => {
      const d1 = new Date('2025-01-01T01:00:00Z')
      const d2 = new Date('2025-01-01T00:00:00Z')
      const result = service.dateDriff(d1, d2)
      expect(result.seconds).toBe(3600)
      expect(result.miliseconds).toBe(3600000)
    })

    it('returns negative diff when first date is earlier', () => {
      const d1 = new Date('2025-01-01T00:00:00Z')
      const d2 = new Date('2025-01-01T01:00:00Z')
      const result = service.dateDriff(d1, d2)
      expect(result.seconds).toBe(-3600)
    })
  })

  describe('bcryptGenrateSalt', () => {
    it('returns a bcrypt salt string', () => {
      const salt = service.bcryptGenrateSalt(10)
      expect(salt).toMatch(/^\$2b\$/)
    })
  })

  describe('bcryptHash + bcryptCompare', () => {
    it('hashes and then verifies the password', () => {
      const salt = service.bcryptGenrateSalt(10)
      const hash = service.bcryptHash('mypassword', salt)
      expect(service.bcryptCompare('mypassword', hash)).toBe(true)
      expect(service.bcryptCompare('wrongpassword', hash)).toBe(false)
    })
  })

  describe('randomString', () => {
    it('generates string of specified length', () => {
      expect(service.randomString(32)).toHaveLength(32)
      expect(service.randomString(8)).toHaveLength(8)
    })

    it('only contains alphanumeric characters', () => {
      const s = service.randomString(100)
      expect(s).toMatch(/^[A-Za-z0-9]+$/)
    })
  })

  describe('getConversationUserIds', () => {
    it('returns user1Id as smaller id', () => {
      const result = service.getConversationUserIds(5, 3)
      expect(result.user1Id).toBe(3)
      expect(result.user2Id).toBe(5)
    })

    it('handles equal ids', () => {
      const result = service.getConversationUserIds(4, 4)
      expect(result.user1Id).toBe(4)
      expect(result.user2Id).toBe(4)
    })
  })
})
