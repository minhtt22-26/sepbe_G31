import {
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { OccupationRepository } from '../repositories/occupation.repository'
import { CreateOccupationRequest } from '../dtos/request/create-occupation.request'
import { UpdateOccupationRequest } from '../dtos/request/update-occupation.request'
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider'

type RedisClient = ReturnType<typeof import('redis').createClient>

@Injectable()
export class OccupationService {
    constructor(
        private readonly occupationRepository: OccupationRepository,
        @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
    ) { }

    private async getCached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
        const cached = await this.redis.get(key)
        if (cached) return JSON.parse(cached) as T
        const data = await fetcher()
        await this.redis.set(key, JSON.stringify(data), { EX: ttlSeconds })
        return data
    }

    private async invalidateCache(...keys: string[]): Promise<void> {
        await Promise.all(keys.map(k => this.redis.del(k)))
    }

    async create(body: CreateOccupationRequest) {
        const normalizedName = body.name.trim()
        const isSectorActive = await this.occupationRepository.isActiveSector(body.sectorId)

        if (!isSectorActive) {
            throw new NotFoundException('Sector not found')
        }

        const existed = await this.occupationRepository.findByNameInSector(
            normalizedName,
            body.sectorId,
        )

        if (existed) {
            throw new ConflictException('Occupation name already exists in sector')
        }

        const result = await this.occupationRepository.create(normalizedName, body.sectorId)
        await this.invalidateCache('occupation:all', 'occupation:withSectors', `occupation:bySector:${body.sectorId}`)
        return result
    }

    async findAll() {
        return this.getCached('occupation:all', 3600, () => this.occupationRepository.findAll())
    }

    async findOne(id: number) {
        const occupation = await this.occupationRepository.findById(id)

        if (!occupation) {
            throw new NotFoundException('Occupation not found')
        }

        return occupation
    }

    async update(id: number, body: UpdateOccupationRequest) {
        const current = await this.occupationRepository.findById(id)

        if (!current) {
            throw new NotFoundException('Occupation not found')
        }

        const targetSectorId = body.sectorId ?? current.sectorId
        const targetName = body.name?.trim() ?? current.name

        const isSectorActive = await this.occupationRepository.isActiveSector(targetSectorId)

        if (!isSectorActive) {
            throw new NotFoundException('Sector not found')
        }

        const isChanged = targetName !== current.name || targetSectorId !== current.sectorId

        if (isChanged) {
            const existed = await this.occupationRepository.findByNameInSector(
                targetName,
                targetSectorId,
            )

            if (existed && existed.id !== id) {
                throw new ConflictException('Occupation name already exists in sector')
            }
        }

        const result = await this.occupationRepository.update(id, targetName, targetSectorId)
        await this.invalidateCache('occupation:all', 'occupation:withSectors', `occupation:bySector:${targetSectorId}`)
        return result
    }

    async remove(id: number) {
        const current = await this.occupationRepository.findById(id)

        if (!current) {
            throw new NotFoundException('Occupation not found')
        }

        await this.occupationRepository.softDelete(id)
        await this.invalidateCache('occupation:all', 'occupation:withSectors', `occupation:bySector:${current.sectorId}`)

        return {
            success: true,
        }
    }

    async getSectorsWithOccupations() {
        return this.getCached('occupation:withSectors', 3600, () => this.occupationRepository.findAllSectorsWithOccupations())
    }

    async getOccupationsBySector(sectorId: number) {
        return this.getCached(`occupation:bySector:${sectorId}`, 3600, () => this.occupationRepository.findOccupationsBySector(sectorId))
    }
}
