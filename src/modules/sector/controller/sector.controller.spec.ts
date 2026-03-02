import { Test, TestingModule } from '@nestjs/testing'
import { SectorController } from './sector.controller'
import { SectorService } from '../service/sector.service'

jest.mock('src/prisma.service', () => ({
    PrismaService: class { },
}))

const sectorServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
}

describe('SectorController', () => {
    let controller: SectorController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SectorController],
            providers: [
                {
                    provide: SectorService,
                    useValue: sectorServiceMock,
                },
            ],
        }).compile()

        controller = module.get<SectorController>(SectorController)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('create should call service.create', async () => {
        const body = { name: 'Sản xuất' }
        const expected = { id: 1, name: 'Sản xuất' }
        sectorServiceMock.create.mockResolvedValue(expected)

        const result = await controller.create(body)

        expect(result).toBe(expected)
        expect(sectorServiceMock.create).toHaveBeenCalledWith(body)
    })

    it('findAll should call service.findAll', async () => {
        const expected = [{ id: 1, name: 'Sản xuất' }]
        sectorServiceMock.findAll.mockResolvedValue(expected)

        const result = await controller.findAll()

        expect(result).toBe(expected)
        expect(sectorServiceMock.findAll).toHaveBeenCalledTimes(1)
    })

    it('findOne should call service.findOne', async () => {
        const expected = { id: 1, name: 'Sản xuất' }
        sectorServiceMock.findOne.mockResolvedValue(expected)

        const result = await controller.findOne(1)

        expect(result).toBe(expected)
        expect(sectorServiceMock.findOne).toHaveBeenCalledWith(1)
    })

    it('update should call service.update', async () => {
        const body = { name: 'Xây dựng' }
        const expected = { id: 1, name: 'Xây dựng' }
        sectorServiceMock.update.mockResolvedValue(expected)

        const result = await controller.update(1, body)

        expect(result).toBe(expected)
        expect(sectorServiceMock.update).toHaveBeenCalledWith(1, body)
    })

    it('remove should call service.remove', async () => {
        const expected = { success: true }
        sectorServiceMock.remove.mockResolvedValue(expected)

        const result = await controller.remove(1)

        expect(result).toBe(expected)
        expect(sectorServiceMock.remove).toHaveBeenCalledWith(1)
    })
})
