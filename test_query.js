const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function check() {
  const allInvitations = await prisma.interviewInvitation.findMany({
    orderBy: { createdAt: 'desc' },
    select: { workerId: true, status: true, selectedSlotId: true, campaign: { select: { jobId: true } } }
  });
  console.log(JSON.stringify(allInvitations, null, 2));
}

check().finally(() => prisma.$disconnect());
