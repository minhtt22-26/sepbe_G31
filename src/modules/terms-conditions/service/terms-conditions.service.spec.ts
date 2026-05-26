import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { TermsConditionsService } from './terms-conditions.service'
import { TermsConditionsRepository } from '../repositories/terms-conditions.repository'

const repoMock = {
    getLatestTermsConditions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
}

describe('TermsConditionsService', () => {
    let service: TermsConditionsService

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermsConditionsService,
                { provide: TermsConditionsRepository, useValue: repoMock },
            ],
        }).compile()

        service = module.get<TermsConditionsService>(TermsConditionsService)
    })

    afterEach(() => jest.clearAllMocks())

    describe('getTermsConditions', () => {
        it('[N] should return terms when found', async () => {
            const terms = { id: 1, content: 'Terms content', createdAt: new Date() }
            repoMock.getLatestTermsConditions.mockResolvedValue(terms)

            const result = await service.getTermsConditions()

            expect(result).toBe(terms)
            expect(repoMock.getLatestTermsConditions).toHaveBeenCalledTimes(1)
        })

        it('[A] should throw NotFoundException when no terms exist', async () => {
            repoMock.getLatestTermsConditions.mockResolvedValue(null)

            await expect(service.getTermsConditions()).rejects.toThrow(NotFoundException)
        })
    })

    describe('updateTermsConditions', () => {
        it('[N] should update and return updated terms', async () => {
            const existing = { id: 1, content: 'Old content' }
            const updated = { id: 1, content: 'New content' }
            repoMock.findById.mockResolvedValue(existing)
            repoMock.update.mockResolvedValue(updated)

            const result = await service.updateTermsConditions(1, { content: 'New content' })

            expect(result).toBe(updated)
            expect(repoMock.update).toHaveBeenCalledWith(1, { content: 'New content' })
        })

        it('[A] should throw NotFoundException when terms not found', async () => {
            repoMock.findById.mockResolvedValue(null)

            await expect(service.updateTermsConditions(99, { content: 'x' })).rejects.toThrow(
                NotFoundException,
            )
        })
    })
})
