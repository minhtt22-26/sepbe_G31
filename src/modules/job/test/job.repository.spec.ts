import { Test, TestingModule } from '@nestjs/testing';
import { JobRepository } from './job.repository';
import { PrismaService } from 'src/prisma.service';

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}));

const prismaMock = {
  job: {
    findUnique: jest.fn(),
  },
};

describe('JobRepository', () => {
  let service: JobRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobRepository,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<JobRepository>(JobRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
