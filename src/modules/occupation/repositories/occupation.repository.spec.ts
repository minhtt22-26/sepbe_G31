import { Test, TestingModule } from '@nestjs/testing'
import { OccupationRepository } from './occupation.repository'
import { PrismaService } from 'src/prisma.service'

const mockPrisma: any = {
  occupation: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  sector: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
}

describe('OccupationRepository', () => {
  let repo: OccupationRepository

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OccupationRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    repo = module.get<OccupationRepository>(OccupationRepository)
  })

  it('findAll returns active occupations', async () => {
    mockPrisma.occupation.findMany.mockResolvedValue([{ id: 1, name: 'Dev' }])
    const result = await repo.findAll()
    expect(result).toHaveLength(1)
  })

  it('findById returns occupation by id', async () => {
    mockPrisma.occupation.findFirst.mockResolvedValue({ id: 1, name: 'Dev' })
    const result = await repo.findById(1)
    expect(result?.id).toBe(1)
  })

  it('findByNameInSector finds by name and sector', async () => {
    mockPrisma.occupation.findFirst.mockResolvedValue({ id: 2 })
    await repo.findByNameInSector('Dev', 5)
    expect(mockPrisma.occupation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ name: 'Dev', sectorId: 5 }) }),
    )
  })

  it('isActiveSector returns true when sector is active', async () => {
    mockPrisma.sector.findFirst.mockResolvedValue({ id: 5 })
    expect(await repo.isActiveSector(5)).toBe(true)
  })

  it('isActiveSector returns false when sector not found', async () => {
    mockPrisma.sector.findFirst.mockResolvedValue(null)
    expect(await repo.isActiveSector(99)).toBe(false)
  })

  it('create creates a new occupation', async () => {
    mockPrisma.occupation.create.mockResolvedValue({ id: 3, name: 'Designer' })
    const result = await repo.create('Designer', 2)
    expect(result.name).toBe('Designer')
  })

  it('update updates occupation', async () => {
    mockPrisma.occupation.update.mockResolvedValue({ id: 1, name: 'Updated' })
    await repo.update(1, 'Updated', 2)
    expect(mockPrisma.occupation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    )
  })

  it('softDelete marks occupation as deleted', async () => {
    mockPrisma.occupation.update.mockResolvedValue({ id: 1 })
    await repo.softDelete(1)
    expect(mockPrisma.occupation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DELETED' }) }),
    )
  })

  it('findAllSectorsWithOccupations returns sectors with occupations', async () => {
    mockPrisma.sector.findMany.mockResolvedValue([{ id: 1, name: 'Tech', occupations: [] }])
    const result = await repo.findAllSectorsWithOccupations()
    expect(result).toHaveLength(1)
  })

  it('findOccupationsBySector returns occupations for a sector', async () => {
    mockPrisma.occupation.findMany.mockResolvedValue([{ id: 1, name: 'Dev' }])
    const result = await repo.findOccupationsBySector(5)
    expect(result).toHaveLength(1)
  })
})
