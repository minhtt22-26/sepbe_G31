import { Test, TestingModule } from '@nestjs/testing'
import { JobService } from '../service/job.service'
import { JobController } from './job.controller'

jest.mock('src/prisma.service', () => ({
  PrismaService: class { },
}))

const jobServiceMock = {
  getApplyForm: jest.fn(),
  applyJob: jest.fn(),
  cancelApplyJob: jest.fn(),
  getApplicationsByUser: jest.fn(),
}

describe('JobController', () => {
  let controller: JobController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobController],
      providers: [
        {
          provide: JobService,
          useValue: jobServiceMock,
        }
      ],
    }).compile()

    controller = module.get<JobController>(JobController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('getApplyForm should call service.getApplyForm', async () => {
    const expected = { success: true, data: { formId: 10 } }
    jobServiceMock.getApplyForm.mockResolvedValue(expected)

    const result = await controller.getApplyForm(1)

    expect(result).toBe(expected)
    expect(jobServiceMock.getApplyForm).toHaveBeenCalledWith(1)
  })

  it('applyJob should call service.applyJob', async () => {
    const body = { answers: [{ fieldId: 1, value: 'a' }] }
    const expected = { success: true, data: { id: 200 } }
    jobServiceMock.applyJob.mockResolvedValue(expected)

    const result = await controller.applyJob(5, body, 42)

    expect(result).toBe(expected)
    expect(jobServiceMock.applyJob).toHaveBeenCalledWith(5, 42, body)
  })

  it('cancelApply should call service.cancelApplyJob', async () => {
    const expected = { success: true }
    jobServiceMock.cancelApplyJob.mockResolvedValue(expected)

    const result = await controller.cancelApply(5, 42)

    expect(result).toBe(expected)
    expect(jobServiceMock.cancelApplyJob).toHaveBeenCalledWith(5, 42)
  })

  it('getMyApplications should call service.getApplicationsByUser', async () => {
    const expected = { success: true, data: [] }
    jobServiceMock.getApplicationsByUser.mockResolvedValue(expected)

    const result = await controller.getMyApplications(42)

    expect(result).toBe(expected)
    expect(jobServiceMock.getApplicationsByUser).toHaveBeenCalledWith(42)
  })
})
