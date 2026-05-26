import {
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { SectorStatus } from 'src/generated/prisma/enums'
import { SectorRepository } from '../repositories/sector.repository'
import { CreateSectorRequest } from '../dtos/request/create-sector.request'
import { UpdateSectorRequest } from '../dtos/request/update-sector.request'
import { REDIS_CLIENT } from 'src/infrastructure/redis/redis.provider'

type RedisClient = ReturnType<typeof import('redis').createClient>

@Injectable()
export class SectorService {
    constructor(
        private readonly sectorRepository: SectorRepository,
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

    async create(body: CreateSectorRequest) {
        const normalizedName = body.name.trim()
        const existed = await this.sectorRepository.findByName(normalizedName)

        if (existed?.status === SectorStatus.DELETED) {
            const result = await this.sectorRepository.restore(existed.id, normalizedName)
            await this.invalidateCache('sector:all')
            return result
        }

        if (existed) {
            throw new ConflictException('Sector name already exists')
        }

        const result = await this.sectorRepository.create(normalizedName)
        await this.invalidateCache('sector:all')
        return result
    }

    async findAll() {
        return this.getCached('sector:all', 3600, () => this.sectorRepository.findAll())
    }

    async findPage(page: number, limit?: number) {
        const rawLimit = limit ?? 10
        const take = Math.min(Math.max(1, rawLimit), 100)
        const safePage = Math.max(1, page)
        const skip = (safePage - 1) * take
        const { items, totalItems } = await this.sectorRepository.findManyPaged(
            skip,
            take,
        )
        const totalPages = Math.max(1, Math.ceil(totalItems / take))
        return {
            data: items,
            page: safePage,
            size: take,
            totalItems,
            totalPages,
        }
    }

    async findOne(id: number) {
        const sector = await this.sectorRepository.findById(id)

        if (!sector) {
            throw new NotFoundException('Sector not found')
        }

        return sector
    }

    async update(id: number, body: UpdateSectorRequest) {
        const current = await this.sectorRepository.findById(id)

        if (!current) {
            throw new NotFoundException('Sector not found')
        }

        const normalizedName = body.name?.trim()

        if (normalizedName && normalizedName !== current.name) {
            const existed = await this.sectorRepository.findByName(normalizedName)

            if (existed && existed.id !== id) {
                throw new ConflictException('Sector name already exists')
            }
        }

        const result = await this.sectorRepository.update(id, normalizedName ?? current.name)
        await this.invalidateCache('sector:all')
        return result
    }

    async remove(id: number) {
        const current = await this.sectorRepository.findById(id)

        if (!current) {
            throw new NotFoundException('Sector not found')
        }

        await this.sectorRepository.softDelete(id)
        await this.invalidateCache('sector:all')

        return {
            success: true,
        }
    }
}
