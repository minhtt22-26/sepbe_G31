import { Test, TestingModule } from '@nestjs/testing'
import { SectorRepository } from './sector.repository'
import { PrismaService } from 'src/prisma.service'

const mockPrisma: any = {
  sector: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
}

describe('SectorRepository', () => {
  let repo: SectorRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectorRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    repo = module.get<SectorRepository>(SectorRepository)
  })

  it('findAll returns active sectors', async () => {
    mockPrisma.sector.findMany.mockResolvedValue([{ id: 1, name: 'IT' }])
    const result = await repo.findAll()
    expect(result).toHaveLength(1)
  })

  it('findManyPaged returns paginated sectors', async () => {
    mockPrisma.sector.findMany.mockResolvedValue([{ id: 1 }])
    mockPrisma.sector.count.mockResolvedValue(5)
    const result = await repo.findManyPaged(0, 10)
    expect(result.items).toHaveLength(1)
    expect(result.totalItems).toBe(5)
  })

  it('findById finds active sector', async () => {
    mockPrisma.sector.findFirst.mockResolvedValue({ id: 3, name: 'Finance' })
    const result = await repo.findById(3)
    expect(result?.id).toBe(3)
  })

  it('findByName finds sector by unique name', async () => {
    mockPrisma.sector.findUnique.mockResolvedValue({ id: 2, name: 'Health' })
    await repo.findByName('Health')
    expect(mockPrisma.sector.findUnique).toHaveBeenCalledWith({ where: { name: 'Health' } })
  })

  it('create creates a new sector', async () => {
    mockPrisma.sector.create.mockResolvedValue({ id: 4, name: 'Edu' })
    const result = await repo.create('Edu')
    expect(result.name).toBe('Edu')
  })

  it('restore restores a deleted sector', async () => {
    mockPrisma.sector.update.mockResolvedValue({ id: 1, name: 'IT' })
    await repo.restore(1, 'IT')
    expect(mockPrisma.sector.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
    )
  })

  it('update updates sector name', async () => {
    mockPrisma.sector.update.mockResolvedValue({ id: 1, name: 'Updated' })
    await repo.update(1, 'Updated')
    expect(mockPrisma.sector.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { name: 'Updated' } }),
    )
  })

  it('softDelete marks sector as deleted', async () => {
    mockPrisma.sector.update.mockResolvedValue({ id: 1 })
    await repo.softDelete(1)
    expect(mockPrisma.sector.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'DELETED' } }),
    )
  })
})
