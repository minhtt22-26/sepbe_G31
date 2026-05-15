const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const campaigns = await prisma.interviewCampaign.findMany({
    select: { id: true, title: true, jobId: true }
  });
  console.log(JSON.stringify(campaigns, null, 2));
}

check().finally(() => prisma.$disconnect());
