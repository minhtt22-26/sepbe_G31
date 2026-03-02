import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { SectorService } from './sector.service'
import { SectorRepository } from '../repositories/sector.repository'

jest.mock('src/prisma.service', () => ({
    PrismaService: class { },
}))

const sectorRepositoryMock = {
    findByName: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
}

describe('SectorService', () => {
    let service: SectorService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SectorService,
                {
                    provide: SectorRepository,
                    useValue: sectorRepositoryMock,
                },
            ],
        }).compile()

        service = module.get<SectorService>(SectorService)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('create should trim name and create sector', async () => {
        sectorRepositoryMock.findByName.mockResolvedValue(null)
        sectorRepositoryMock.create.mockResolvedValue({ id: 1, name: 'Sản xuất' })

        const result = await service.create({ name: '  Sản xuất  ' })

        expect(result).toEqual({ id: 1, name: 'Sản xuất' })
        expect(sectorRepositoryMock.findByName).toHaveBeenCalledWith('Sản xuất')
        expect(sectorRepositoryMock.create).toHaveBeenCalledWith('Sản xuất')
    })

    it('create should throw when sector name already exists', async () => {
        sectorRepositoryMock.findByName.mockResolvedValue({ id: 99, name: 'Sản xuất' })

        await expect(service.create({ name: 'Sản xuất' })).rejects.toBeInstanceOf(
            ConflictException,
        )
    })

    it('findAll should return all active sectors', async () => {
        const expected = [{ id: 1, name: 'Sản xuất' }]
        sectorRepositoryMock.findAll.mockResolvedValue(expected)

        const result = await service.findAll()

        expect(result).toBe(expected)
        expect(sectorRepositoryMock.findAll).toHaveBeenCalledTimes(1)
    })

    it('findOne should throw when sector not found', async () => {
        sectorRepositoryMock.findById.mockResolvedValue(null)

        await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('findOne should return sector when found', async () => {
        const expected = { id: 1, name: 'Sản xuất' }
        sectorRepositoryMock.findById.mockResolvedValue(expected)

        const result = await service.findOne(1)

        expect(result).toBe(expected)
        expect(sectorRepositoryMock.findById).toHaveBeenCalledWith(1)
    })

    it('update should throw when sector not found', async () => {
        sectorRepositoryMock.findById.mockResolvedValue(null)

        await expect(service.update(1, { name: 'Xây dựng' })).rejects.toBeInstanceOf(
            NotFoundException,
        )
    })

    it('update should throw on duplicate name', async () => {
        sectorRepositoryMock.findById.mockResolvedValue({ id: 1, name: 'Sản xuất' })
        sectorRepositoryMock.findByName.mockResolvedValue({ id: 2, name: 'Xây dựng' })

        await expect(service.update(1, { name: 'Xây dựng' })).rejects.toBeInstanceOf(
            ConflictException,
        )
    })

    it('update should trim and update name', async () => {
        sectorRepositoryMock.findById.mockResolvedValue({ id: 1, name: 'Sản xuất' })
        sectorRepositoryMock.findByName.mockResolvedValue(null)
        sectorRepositoryMock.update.mockResolvedValue({ id: 1, name: 'Xây dựng' })

        const result = await service.update(1, { name: '  Xây dựng  ' })

        expect(result).toEqual({ id: 1, name: 'Xây dựng' })
        expect(sectorRepositoryMock.findByName).toHaveBeenCalledWith('Xây dựng')
        expect(sectorRepositoryMock.update).toHaveBeenCalledWith(1, 'Xây dựng')
    })

    it('remove should throw when sector not found', async () => {
        sectorRepositoryMock.findById.mockResolvedValue(null)

        await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException)
    })

    it('remove should soft delete sector', async () => {
        sectorRepositoryMock.findById.mockResolvedValue({ id: 1, name: 'Sản xuất' })
        sectorRepositoryMock.softDelete.mockResolvedValue({
            id: 1,
            name: 'Sản xuất',
            status: 'DELETED',
        })

        const result = await service.remove(1)

        expect(result).toEqual({ success: true })
        expect(sectorRepositoryMock.softDelete).toHaveBeenCalledWith(1)
    })
})
