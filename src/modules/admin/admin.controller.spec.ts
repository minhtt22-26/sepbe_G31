import { Test, TestingModule } from '@nestjs/testing'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { OrderType } from 'src/generated/prisma/enums'

const mockAdminService = {
  getStatistics: jest.fn(),
  getPaymentPackages: jest.fn(),
  createPaymentPackage: jest.fn(),
  updatePaymentPackage: jest.fn(),
  getPointPricingSettings: jest.fn(),
  updatePointPricingSettings: jest.fn(),
}

describe('AdminController', () => {
  let controller: AdminController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    }).compile()
    controller = module.get<AdminController>(AdminController)
  })

  it('getStatistics passes year as number to service', async () => {
    mockAdminService.getStatistics.mockResolvedValue({ users: {} })
    const result = await controller.getStatistics('2025')
    expect(mockAdminService.getStatistics).toHaveBeenCalledWith(2025)
    expect(result).toEqual({ users: {} })
  })

  it('getStatistics passes undefined when no year', async () => {
    mockAdminService.getStatistics.mockResolvedValue({})
    await controller.getStatistics()
    expect(mockAdminService.getStatistics).toHaveBeenCalledWith(undefined)
  })

  it('getPaymentPackages with includeInactive=true', async () => {
    mockAdminService.getPaymentPackages.mockResolvedValue({ items: [] })
    await controller.getPaymentPackages(OrderType.BOOST_JOB, 'true')
    expect(mockAdminService.getPaymentPackages).toHaveBeenCalledWith({
      orderType: OrderType.BOOST_JOB, includeInactive: true,
    })
  })

  it('getPaymentPackages defaults includeInactive to false', async () => {
    mockAdminService.getPaymentPackages.mockResolvedValue({ items: [] })
    await controller.getPaymentPackages()
    expect(mockAdminService.getPaymentPackages).toHaveBeenCalledWith({
      orderType: undefined, includeInactive: false,
    })
  })

  it('createPaymentPackage delegates to service', async () => {
    const dto: any = { name: 'Test', price: 50000 }
    mockAdminService.createPaymentPackage.mockResolvedValue({ message: 'ok' })
    const result = await controller.createPaymentPackage(dto)
    expect(mockAdminService.createPaymentPackage).toHaveBeenCalledWith(dto)
    expect(result.message).toBe('ok')
  })

  it('updatePaymentPackage delegates to service with id', async () => {
    const dto: any = { price: 60000 }
    mockAdminService.updatePaymentPackage.mockResolvedValue({ message: 'updated' })
    await controller.updatePaymentPackage(5, dto)
    expect(mockAdminService.updatePaymentPackage).toHaveBeenCalledWith(5, dto)
  })

  it('getPointPricingSettings delegates to service', async () => {
    mockAdminService.getPointPricingSettings.mockResolvedValue({ items: [] })
    const result = await controller.getPointPricingSettings()
    expect(result.items).toEqual([])
  })

  it('updatePointPricingSettings delegates to service', async () => {
    const body = { JOB_POST_POINT_COST: 40000, BOOST_JOB_POINT_COST: 50000, BOOST_JOB_DURATION_DAYS: 7, AI_INVITE_POINT_COST_PER_WORKER: 1000 }
    mockAdminService.updatePointPricingSettings.mockResolvedValue({ items: [] })
    await controller.updatePointPricingSettings(body)
    expect(mockAdminService.updatePointPricingSettings).toHaveBeenCalledWith(body)
  })
})
