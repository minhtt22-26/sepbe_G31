const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const jobsWithSuitable = await prisma.jobApplication.findMany({
    where: { status: 'SUITABLE' },
    select: { jobId: true, job: { select: { title: true, status: true } } },
    distinct: ['jobId'],
  });
  console.log('Jobs with suitable candidates:', JSON.stringify(jobsWithSuitable, null, 2));
  
  const suitableJobIds = jobsWithSuitable.map(j => j.jobId);
  const scheduledCampaigns = await prisma.interviewInvitationCampaign.findMany({
    where: {
      jobId: { in: suitableJobIds },
      status: { not: 'CANCELLED' },
      slots: { some: {} }
    },
    select: { jobId: true, title: true },
  });
  console.log('Scheduled campaigns:', JSON.stringify(scheduledCampaigns, null, 2));
}
check().finally(() => prisma.$disconnect());
