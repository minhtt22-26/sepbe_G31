import { Test, TestingModule } from '@nestjs/testing';
import { JobRepository } from './job.repository';

describe('JobRepository', () => {
  let service: JobRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobRepository],
    }).compile();

    service = module.get<JobRepository>(JobRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
