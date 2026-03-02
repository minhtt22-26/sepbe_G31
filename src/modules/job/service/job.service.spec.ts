import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JobService } from './job.service';
import { JobRepository } from '../repositories/job.repository';
import {
  JobApplicationStatus,
  JobStatus,
} from 'src/generated/prisma/enums';

jest.mock('src/prisma.service', () => ({
  PrismaService: class {},
}));

const jobRepositoryMock = {
  findJobWithApplyForm: jest.fn(),
  applyJob: jest.fn(),
  findApplicationByJobAndUser: jest.fn(),
  cancelApply: jest.fn(),
};

describe('JobService', () => {
  let service: JobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: JobRepository,
          useValue: jobRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getApplyForm should throw when job not found', async () => {
    jobRepositoryMock.findJobWithApplyForm.mockResolvedValue(null);

    await expect(service.getApplyForm(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('getApplyForm should return first form fields', async () => {
    jobRepositoryMock.findJobWithApplyForm.mockResolvedValue({
      id: 1,
      title: 'Công nhân may',
      status: JobStatus.PUBLISHED,
      applyForms: [
        {
          id: 10,
          fields: [{ id: 100, label: 'Họ tên', fieldType: 'text', isRequired: true }],
        },
      ],
    });

    const result = await service.getApplyForm(1);

    expect(result.success).toBe(true);
    expect(result.data.formId).toBe(10);
  });

  it('applyJob should throw if required field is missing', async () => {
    jobRepositoryMock.findJobWithApplyForm.mockResolvedValue({
      id: 1,
      title: 'Công nhân may',
      status: JobStatus.PUBLISHED,
      applyForms: [
        {
          id: 10,
          fields: [{ id: 100, label: 'Họ tên', fieldType: 'text', isRequired: true, options: null }],
        },
      ],
    });

    await expect(
      service.applyJob(1, 2, {
        answers: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applyJob should call repository when payload is valid', async () => {
    jobRepositoryMock.findJobWithApplyForm.mockResolvedValue({
      id: 1,
      title: 'Công nhân may',
      status: JobStatus.PUBLISHED,
      applyForms: [
        {
          id: 10,
          fields: [
            { id: 100, label: 'Họ tên', fieldType: 'text', isRequired: true, options: null },
            {
              id: 101,
              label: 'Ca làm',
              fieldType: 'select',
              isRequired: true,
              options: '["MORNING","AFTERNOON"]',
            },
          ],
        },
      ],
    });
    jobRepositoryMock.applyJob.mockResolvedValue({ id: 200, status: JobApplicationStatus.APPLIED });

    const result = await service.applyJob(1, 2, {
      answers: [
        { fieldId: 100, value: 'Nguyễn Văn A' },
        { fieldId: 101, value: 'MORNING' },
      ],
    });

    expect(result.success).toBe(true);
    expect(jobRepositoryMock.applyJob).toHaveBeenCalledWith({
      jobId: 1,
      userId: 2,
      answers: [
        { fieldId: 100, value: 'Nguyễn Văn A' },
        { fieldId: 101, value: 'MORNING' },
      ],
    });
  });

  it('cancelApplyJob should throw if application not found', async () => {
    jobRepositoryMock.findApplicationByJobAndUser.mockResolvedValue(null);

    await expect(service.cancelApplyJob(1, 2)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancelApplyJob should throw if already cancelled', async () => {
    jobRepositoryMock.findApplicationByJobAndUser.mockResolvedValue({
      id: 100,
      status: JobApplicationStatus.CANCELLED,
    });

    await expect(service.cancelApplyJob(1, 2)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancelApplyJob should cancel when status is APPLIED', async () => {
    jobRepositoryMock.findApplicationByJobAndUser.mockResolvedValue({
      id: 100,
      status: JobApplicationStatus.APPLIED,
    });
    jobRepositoryMock.cancelApply.mockResolvedValue({ id: 100 });

    const result = await service.cancelApplyJob(1, 2);

    expect(result).toEqual({ success: true });
    expect(jobRepositoryMock.cancelApply).toHaveBeenCalledWith(1, 2);
  });
});
