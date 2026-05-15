const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: { fullName: { contains: 'Lộc' } },
    include: {
      interviewInvitations: {
        include: { campaign: true }
      }
    }
  });

  console.log(JSON.stringify(users, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
