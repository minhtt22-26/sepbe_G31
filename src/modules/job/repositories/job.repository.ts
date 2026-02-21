import { Injectable } from '@nestjs/common'
import {
  Prisma,
} from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class JobRepository {

  constructor(private readonly prisma: PrismaService) { }

  async create(data: Prisma.JobCreateInput) {
    return this.prisma.job.create({ data });
  }

  async findAll() {
    return this.prisma.job.findMany({
      include: {
        company: true,
        occupation: true,
      },
    });
  }

  async findById(id: number) {
    return this.prisma.job.findUnique({
      where: { id },
      include: {
        company: true,
        occupation: true,
      },
    });
  }

  async update(id: number, data: Prisma.JobUpdateInput) {
    return this.prisma.job.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    return this.prisma.job.delete({
      where: { id },
    });
  }

}
