import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CompanyRegisterDto } from '../dtos/request/company.register';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany();
  }

  findOne(id: number) {
    return this.prisma.company.findUnique({
      where: { id },
    });
  }

  create(data: CompanyRegisterDto) {
    return this.prisma.company.create({ 
      data: {
        ownerId: 3,
        name: data.name,
        taxCode: data.taxCode,
        address: data.address,
        description: data.description,
        website: data.website,
      }
    });
  }

  update(id: number, data: any) {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  remove(id: number) {
    return this.prisma.company.delete({
      where: { id },
    });
  }
}
