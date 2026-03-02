import { Test, TestingModule } from '@nestjs/testing'
import { OccupationController } from './occupation.controller'
import { OccupationService } from '../service/occupation.service'

jest.mock('src/prisma.service', () => ({
    PrismaService: class { },
}))

const occupationServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getSectorsWithOccupations: jest.fn(),
    getOccupationsBySector: jest.fn(),
}

describe('OccupationController', () => {
    let controller: OccupationController

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OccupationController],
            providers: [
                {
                    provide: OccupationService,
                    useValue: occupationServiceMock,
                },
            ],
        }).compile()

        controller = module.get<OccupationController>(OccupationController)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('create should call service.create', async () => {
        const body = { name: 'Công nhân may', sectorId: 1 }
        const expected = { id: 1, ...body }
        occupationServiceMock.create.mockResolvedValue(expected)

        const result = await controller.create(body)

        expect(result).toBe(expected)
        expect(occupationServiceMock.create).toHaveBeenCalledWith(body)
    })

    it('getSectorsWithOccupations should call service', async () => {
        const expected = [{ id: 1, occupations: [] }]
        occupationServiceMock.getSectorsWithOccupations.mockResolvedValue(expected)

        const result = await controller.getSectorsWithOccupations()

        expect(result).toBe(expected)
    })

    it('getOccupationsBySector should call service', async () => {
        const expected = [{ id: 1, name: 'Công nhân may' }]
        occupationServiceMock.getOccupationsBySector.mockResolvedValue(expected)

        const result = await controller.getOccupationsBySector(2)

        expect(result).toBe(expected)
        expect(occupationServiceMock.getOccupationsBySector).toHaveBeenCalledWith(2)
    })

    it('findAll should call service.findAll', async () => {
        const expected = [{ id: 1, name: 'Công nhân may' }]
        occupationServiceMock.findAll.mockResolvedValue(expected)

        const result = await controller.findAll()

        expect(result).toBe(expected)
        expect(occupationServiceMock.findAll).toHaveBeenCalledTimes(1)
    })

    it('findOne should call service.findOne', async () => {
        const expected = { id: 1, name: 'Công nhân may' }
        occupationServiceMock.findOne.mockResolvedValue(expected)

        const result = await controller.findOne(1)

        expect(result).toBe(expected)
        expect(occupationServiceMock.findOne).toHaveBeenCalledWith(1)
    })

    it('update should call service.update', async () => {
        const body = { name: 'Kỹ thuật viên', sectorId: 2 }
        const expected = { id: 1, ...body }
        occupationServiceMock.update.mockResolvedValue(expected)

        const result = await controller.update(1, body)

        expect(result).toBe(expected)
        expect(occupationServiceMock.update).toHaveBeenCalledWith(1, body)
    })

    it('remove should call service.remove', async () => {
        const expected = { success: true }
        occupationServiceMock.remove.mockResolvedValue(expected)

        const result = await controller.remove(1)

        expect(result).toBe(expected)
        expect(occupationServiceMock.remove).toHaveBeenCalledWith(1)
    })
})
