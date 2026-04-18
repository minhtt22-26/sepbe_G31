import { Test, TestingModule } from '@nestjs/testing'
import { SepayService } from '../service/sepay.service'
import paymentConfig from 'src/config/payment.config'

describe('SepayService', () => {
  let service: SepayService

  let paymentCfg: {
    sepayBankCode: string | null
    sepayAccountNumber: string | null
    sepayAccountName: string | null
    sepayOrderPrefix: string
    sepayWebhookApiKey: string | null
  }

  beforeEach(async () => {
    paymentCfg = {
      sepayBankCode: 'BIDV',
      sepayAccountNumber: '0123456789',
      sepayAccountName: 'Test Company',
      sepayOrderPrefix: 'BOOST',
      sepayWebhookApiKey: 'test-api-key',
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SepayService,
        {
          provide: paymentConfig.KEY,
          useValue: paymentCfg,
        },
      ],
    }).compile()

    service = module.get<SepayService>(SepayService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('ensureCheckoutConfig', () => {
    it('should not throw when config is complete', () => {
      expect(() => service.ensureCheckoutConfig()).not.toThrow()
    })

    it('should throw when bankCode is missing', () => {
      paymentCfg.sepayBankCode = null

      expect(() => service.ensureCheckoutConfig()).toThrow()
    })

    it('should throw when accountNumber is missing', () => {
      paymentCfg.sepayAccountNumber = null

      expect(() => service.ensureCheckoutConfig()).toThrow()
    })
  })

  describe('buildBoostCheckout', () => {
    it('should build checkout with correct parameters', () => {
      const result = service.buildBoostCheckout(1, 100000)

      expect(result.paymentCode).toBe('BOOST1')
      expect(result.paymentUrl).toContain('img.vietqr.io')
      expect(result.paymentUrl).toContain('BIDV')
      expect(result.paymentUrl).toContain('0123456789')
      expect(result.paymentUrl).toContain('100000')
      expect(result.transferNote).toBe('BOOST1')
      expect(result.bankCode).toBe('BIDV')
      expect(result.accountNumber).toBe('0123456789')
      expect(result.accountName).toBe('Test Company')
    })

    it('should include accountName in URL when provided', () => {
      const result = service.buildBoostCheckout(2, 50000)

      expect(result.paymentUrl).toMatch(/accountName=Test(?:%20|\+)Company/)
    })

    it('should not throw when accountName is null', () => {
      paymentCfg.sepayAccountName = null

      const result = service.buildBoostCheckout(3, 50000)
      expect(result.accountName).toBeNull()
    })

    it('should throw when config is invalid', () => {
      paymentCfg.sepayBankCode = null
      paymentCfg.sepayAccountNumber = null

      expect(() => service.buildBoostCheckout(1, 100000)).toThrow()
    })
  })

  describe('isValidWebhookAuthorization', () => {
    it('should return true when no webhook API key is configured', () => {
      paymentCfg.sepayWebhookApiKey = null

      const result = service.isValidWebhookAuthorization('any-key')
      expect(result).toBe(true)
    })

    it('should return true when header matches API key', () => {
      const result = service.isValidWebhookAuthorization('apikey test-api-key')
      expect(result).toBe(true)
    })

    it('should return false when header does not match', () => {
      const result = service.isValidWebhookAuthorization('apikey wrong-key')
      expect(result).toBe(false)
    })

    it('should return false when header is missing', () => {
      const result = service.isValidWebhookAuthorization(undefined)
      expect(result).toBe(false)
    })

    it('should be case-insensitive', () => {
      const result = service.isValidWebhookAuthorization('APIKEY TEST-API-KEY')
      expect(result).toBe(true)
    })

    it('should handle whitespace', () => {
      const result = service.isValidWebhookAuthorization('  apikey test-api-key  ')
      expect(result).toBe(true)
    })
  })

  describe('extractOrderIdFromPayload', () => {
    it('should extract orderId from code field', () => {
      const payload = { code: 'BOOST123', content: '', description: '' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBe(123)
    })

    it('should extract orderId from content field', () => {
      const payload = { code: '', content: 'BOOST456', description: '' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBe(456)
    })

    it('should extract orderId from description field', () => {
      const payload = { code: '', content: '', description: 'BOOST789' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBe(789)
    })

    it('should extract from any field in joined string', () => {
      const payload = {
        code: 'Some text',
        content: 'BOOST999',
        description: 'More text',
      }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBe(999)
    })

    it('should return null when no match found', () => {
      const payload = { code: 'NO_MATCH', content: 'TEST', description: 'DATA' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBeNull()
    })

    it('should return null for invalid orderId', () => {
      const payload = { code: 'BOOST-123', content: '', description: '' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBeNull()
    })

    it('should be case-insensitive', () => {
      const payload = { code: 'boost555', content: '', description: '' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBe(555)
    })

    it('should handle custom prefix', () => {
      paymentCfg.sepayOrderPrefix = 'JOB'

      const payload = { code: 'JOB888', content: '', description: '' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBe(888)
    })

    it('should extract orderId when prefix is separated by spaces', () => {
      const payload = { code: 'BOOST 123', content: '', description: '' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBe(123)
    })

    it('should extract orderId when prefix is separated by hyphen', () => {
      const payload = { code: 'BOOST-456', content: '', description: '' }
      const result = service.extractOrderIdFromPayload(payload)
      expect(result).toBe(456)
    })
  })
})
