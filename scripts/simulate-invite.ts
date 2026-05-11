import 'dotenv/config'
import { PrismaService } from '../src/prisma.service'
import { JobRepository } from '../src/modules/job/repositories/job.repository'
import { JobService } from '../src/modules/job/service/job.service'

async function main() {
  const prisma = new PrismaService()
  try {
    await prisma.$connect()
  } catch (err) {
    console.error('Failed to connect to DB:', err.message)
    process.exit(1)
  }

  const jobRepo = new JobRepository(prisma)
  const sepayService = {} as any
  const aiMatchingService = {} as any
  const interviewInvitationService = {} as any

  const jobService = new JobService(jobRepo, sepayService, aiMatchingService, interviewInvitationService)

  const applicationId = Number(process.argv[2] || 1)
  const companyId = Number(process.argv[3] || 1)

  console.log(`Simulating updateApplicationStatus(applicationId=${applicationId}, companyId=${companyId}, status=SUITABLE)`)

  try {
    const res = await jobService.updateApplicationStatus(applicationId, companyId, 'SUITABLE' as any)
    console.log('Result:', res)
  } catch (err: any) {
    console.error('Error during simulation:', err.message || err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
