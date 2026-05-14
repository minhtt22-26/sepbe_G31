const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const companyId = 1; // Assuming employer1@example.com is companyId 1

  const jobsWithSuitable = await prisma.jobApplication.findMany({
    where: {
      job: { companyId },
      status: 'SUITABLE',
    },
    select: { jobId: true, job: { select: { title: true } } },
    distinct: ['jobId'],
  });

  const suitableJobIds = jobsWithSuitable.map(j => j.jobId);
  console.log("Suitable jobs:", suitableJobIds);

  let hasInterviewWarning = false;
  if (suitableJobIds.length > 0) {
    const scheduledCampaigns = await prisma.interviewInvitationCampaign.findMany({
      where: {
        jobId: { in: suitableJobIds },
        status: { not: 'CANCELLED' },
        slots: { some: {} }
      },
      select: { jobId: true, title: true, status: true },
    });
    console.log("Scheduled campaigns:", scheduledCampaigns);

    const scheduledJobIds = new Set(scheduledCampaigns.map(c => c.jobId));
    console.log("Scheduled job IDs:", Array.from(scheduledJobIds));

    const jobsWithoutSchedule = suitableJobIds.filter(id => !scheduledJobIds.has(id));
    console.log("Jobs without schedule:", jobsWithoutSchedule);

    hasInterviewWarning = suitableJobIds.some(id => !scheduledJobIds.has(id));
    console.log("hasInterviewWarning:", hasInterviewWarning);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
