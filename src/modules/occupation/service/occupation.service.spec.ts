import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { OccupationService } from './occupation.service'
import { OccupationRepository } from '../repositories/occupation.repository'

jest.mock('src/prisma.service', () => ({
    PrismaService: class { },
}))

const occupationRepositoryMock = {
    isActiveSector: jest.fn(),
    findByNameInSector: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findAllSectorsWithOccupations: jest.fn(),
    findOccupationsBySector: jest.fn(),
}

describe('OccupationService', () => {
    let service: OccupationService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OccupationService,
                {
                    provide: OccupationRepository,
                    useValue: occupationRepositoryMock,
                },
            ],
        }).compile()

        service = module.get<OccupationService>(OccupationService)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('create should throw when sector not found', async () => {
        occupationRepositoryMock.isActiveSector.mockResolvedValue(false)

        await expect(service.create({ name: 'Công nhân may', sectorId: 1 })).rejects.toBeInstanceOf(
            NotFoundException,
        )
    })

    it('create should throw when name exists in sector', async () => {
        occupationRepositoryMock.isActiveSector.mockResolvedValue(true)
        occupationRepositoryMock.findByNameInSector.mockResolvedValue({ id: 2 })

        await expect(service.create({ name: 'Công nhân may', sectorId: 1 })).rejects.toBeInstanceOf(
            ConflictException,
        )
    })

    it('create should trim name and create occupation', async () => {
        occupationRepositoryMock.isActiveSector.mockResolvedValue(true)
        occupationRepositoryMock.findByNameInSector.mockResolvedValue(null)
        occupationRepositoryMock.create.mockResolvedValue({ id: 1, name: 'Công nhân may', sectorId: 1 })

        const result = await service.create({ name: '  Công nhân may ', sectorId: 1 })

        expect(result).toEqual({ id: 1, name: 'Công nhân may', sectorId: 1 })
        expect(occupationRepositoryMock.findByNameInSector).toHaveBeenCalledWith('Công nhân may', 1)
        expect(occupationRepositoryMock.create).toHaveBeenCalledWith('Công nhân may', 1)
    })

    it('findAll should return active occupations', async () => {
        const expected = [{ id: 1, name: 'Công nhân may' }]
        occupationRepositoryMock.findAll.mockResolvedValue(expected)

        const result = await service.findAll()

        expect(result).toBe(expected)
    })

    it('findOne should throw when not found', async () => {
        occupationRepositoryMock.findById.mockResolvedValue(null)

        await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('findOne should return occupation', async () => {
        const expected = { id: 1, name: 'Công nhân may', sectorId: 1 }
        occupationRepositoryMock.findById.mockResolvedValue(expected)

        const result = await service.findOne(1)

        expect(result).toBe(expected)
    })

    it('update should throw when occupation not found', async () => {
        occupationRepositoryMock.findById.mockResolvedValue(null)

        await expect(service.update(1, { name: 'Kỹ thuật viên' })).rejects.toBeInstanceOf(
            NotFoundException,
        )
    })

    it('update should throw when target sector not found', async () => {
        occupationRepositoryMock.findById.mockResolvedValue({ id: 1, name: 'Công nhân may', sectorId: 1 })
        occupationRepositoryMock.isActiveSector.mockResolvedValue(false)

        await expect(service.update(1, { sectorId: 2 })).rejects.toBeInstanceOf(NotFoundException)
    })

    it('update should throw when duplicate exists', async () => {
        occupationRepositoryMock.findById.mockResolvedValue({ id: 1, name: 'Công nhân may', sectorId: 1 })
        occupationRepositoryMock.isActiveSector.mockResolvedValue(true)
        occupationRepositoryMock.findByNameInSector.mockResolvedValue({ id: 2, name: 'Kỹ thuật viên', sectorId: 1 })

        await expect(service.update(1, { name: 'Kỹ thuật viên' })).rejects.toBeInstanceOf(
            ConflictException,
        )
    })

    it('update should apply trimmed name and sector', async () => {
        occupationRepositoryMock.findById.mockResolvedValue({ id: 1, name: 'Công nhân may', sectorId: 1 })
        occupationRepositoryMock.isActiveSector.mockResolvedValue(true)
        occupationRepositoryMock.findByNameInSector.mockResolvedValue(null)
        occupationRepositoryMock.update.mockResolvedValue({ id: 1, name: 'Kỹ thuật viên', sectorId: 2 })

        const result = await service.update(1, { name: '  Kỹ thuật viên ', sectorId: 2 })

        expect(result).toEqual({ id: 1, name: 'Kỹ thuật viên', sectorId: 2 })
        expect(occupationRepositoryMock.update).toHaveBeenCalledWith(1, 'Kỹ thuật viên', 2)
    })

    it('remove should throw when occupation not found', async () => {
        occupationRepositoryMock.findById.mockResolvedValue(null)

        await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('remove should soft delete occupation', async () => {
        occupationRepositoryMock.findById.mockResolvedValue({ id: 1, name: 'Công nhân may', sectorId: 1 })
        occupationRepositoryMock.softDelete.mockResolvedValue({ id: 1, status: 'DELETED' })

        const result = await service.remove(1)

        expect(result).toEqual({ success: true })
        expect(occupationRepositoryMock.softDelete).toHaveBeenCalledWith(1)
    })

    it('getSectorsWithOccupations should call repository', async () => {
        const expected = [{ id: 1, name: 'Sản xuất', occupations: [] }]
        occupationRepositoryMock.findAllSectorsWithOccupations.mockResolvedValue(expected)

        const result = await service.getSectorsWithOccupations()

        expect(result).toBe(expected)
    })

    it('getOccupationsBySector should call repository', async () => {
        const expected = [{ id: 1, name: 'Công nhân may' }]
        occupationRepositoryMock.findOccupationsBySector.mockResolvedValue(expected)

        const result = await service.getOccupationsBySector(1)

        expect(result).toBe(expected)
        expect(occupationRepositoryMock.findOccupationsBySector).toHaveBeenCalledWith(1)
    })
})
