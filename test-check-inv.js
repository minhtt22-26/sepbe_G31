const { PrismaClient } = require('./src/generated/prisma/client');
const p = new PrismaClient();

(async () => {
  // Check a slot-less invitation (campaign with no slots)
  const slotLessInv = await p.interviewInvitation.findFirst({
    where: {
      campaign: { slots: { none: {} } }
    },
    include: {
      campaign: {
        include: { slots: true }
      }
    }
  });

  if (slotLessInv) {
    console.log('=== Slot-less invitation found ===');
    console.log('  invitationId:', slotLessInv.id);
    console.log('  campaignId:', slotLessInv.campaignId);
    console.log('  workerId:', slotLessInv.workerId);
    console.log('  status:', slotLessInv.status);
    console.log('  campaign.jobId:', slotLessInv.campaign?.jobId);
    console.log('  campaign.companyId:', slotLessInv.campaign?.companyId);
    console.log('  campaign.status:', slotLessInv.campaign?.status);
    console.log('  campaign.slots.length:', slotLessInv.campaign?.slots?.length);

    // Check if there's an active campaign WITH slots for the same job
    if (slotLessInv.campaign?.jobId) {
      const activeCampaignWithSlots = await p.interviewInvitationCampaign.findFirst({
        where: {
          jobId: slotLessInv.campaign.jobId,
          companyId: slotLessInv.campaign.companyId,
          id: { not: slotLessInv.campaignId },
          status: { in: ['IN_PROGRESS', 'COMPLETED', 'DRAFT'] },
          slots: { some: {} },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          slots: { orderBy: { startAt: 'asc' } },
        },
      });

      if (activeCampaignWithSlots) {
        console.log('\n=== Active campaign WITH slots found ===');
        console.log('  campaignId:', activeCampaignWithSlots.id);
        console.log('  status:', activeCampaignWithSlots.status);
        console.log('  slots:', activeCampaignWithSlots.slots.length);

        // Check if worker already invited
        const alreadyInvited = await p.interviewInvitation.findFirst({
          where: {
            workerId: slotLessInv.workerId,
            campaignId: activeCampaignWithSlots.id,
            status: { in: ['PENDING', 'ACCEPTED'] },
          },
        });
        console.log('  workerAlreadyInvited:', !!alreadyInvited);
      } else {
        console.log('\n>>> No active campaign with slots found for job', slotLessInv.campaign.jobId);
      }
    }
  } else {
    console.log('No slot-less invitation found.');
  }

  // Also check all campaigns
  const allCampaigns = await p.interviewInvitationCampaign.findMany({
    include: { slots: true, invitations: { select: { id: true, workerId: true, status: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('\n=== Recent campaigns ===');
  for (const c of allCampaigns) {
    console.log(`  Campaign #${c.id}: job=${c.jobId}, status=${c.status}, slots=${c.slots.length}, invitations=${c.invitations.length}`);
  }

  await p.$disconnect();
})();
