// Debug script - raw SQL to check campaigns
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.wdbasdpydksvsnayrjub:SEPG31%402026@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
});

async function main() {
  await client.connect();

  // 1. Find most recently accepted invitation
  const { rows: recentInv } = await client.query(`
    SELECT ii.id, ii."campaignId", ii."workerId", ii.status, ii."updatedAt",
           iic.title, iic."jobId", iic."companyId", iic.status as campaign_status,
           (SELECT COUNT(*) FROM "InterviewInvitationSlot" s WHERE s."campaignId" = iic.id) as slot_count,
           u."fullName" as worker_name
    FROM "InterviewInvitation" ii
    JOIN "InterviewInvitationCampaign" iic ON ii."campaignId" = iic.id
    JOIN "User" u ON ii."workerId" = u.id
    WHERE ii.status = 'ACCEPTED'
    ORDER BY ii."updatedAt" DESC
    LIMIT 1
  `);

  if (!recentInv.length) {
    console.log('No accepted invitation found');
    return;
  }

  const inv = recentInv[0];
  console.log('\n=== MOST RECENT ACCEPTED INVITATION ===');
  console.log('Invitation ID:', inv.id);
  console.log('Worker:', inv.worker_name, '#' + inv.workerId);
  console.log('Campaign ID:', inv.campaignId);
  console.log('Campaign Title:', inv.title);
  console.log('Campaign JobId:', inv.jobId);
  console.log('Campaign CompanyId:', inv.companyId);
  console.log('Campaign Status:', inv.campaign_status);
  console.log('Campaign Slot Count:', inv.slot_count);
  console.log('Is Slot-Less:', Number(inv.slot_count) === 0);

  if (!inv.jobId) {
    console.log('\n❌ Campaign has no jobId! Auto-add cannot work.');
    return;
  }

  // 2. Find ALL campaigns for same job
  console.log('\n=== ALL CAMPAIGNS FOR JOB #' + inv.jobId + ' (company #' + inv.companyId + ') ===');
  const { rows: allCampaigns } = await client.query(`
    SELECT iic.id, iic.title, iic.status, iic."jobId", iic."companyId",
           (SELECT COUNT(*) FROM "InterviewInvitationSlot" s WHERE s."campaignId" = iic.id) as slot_count,
           (SELECT COUNT(*) FROM "InterviewInvitation" i WHERE i."campaignId" = iic.id) as inv_count
    FROM "InterviewInvitationCampaign" iic
    WHERE iic."jobId" = $1 AND iic."companyId" = $2
    ORDER BY iic."createdAt" DESC
  `, [inv.jobId, inv.companyId]);

  for (const c of allCampaigns) {
    const isCurrent = c.id === inv.campaignId;
    console.log(`\n  Campaign #${c.id} ${isCurrent ? '(CURRENT)' : ''}:`);
    console.log(`    Title: ${c.title}`);
    console.log(`    Status: ${c.status}`);
    console.log(`    Slots: ${c.slot_count}`);
    console.log(`    Invitations: ${c.inv_count}`);

    if (Number(c.slot_count) > 0) {
      console.log('    ✅ HAS SLOTS!');
      const { rows: slots } = await client.query(`
        SELECT id, "startAt", "endAt", capacity, "bookedCount", location
        FROM "InterviewInvitationSlot" WHERE "campaignId" = $1
        ORDER BY "startAt" ASC
      `, [c.id]);
      for (const s of slots) {
        console.log(`      Slot #${s.id}: ${s.startAt} - ${s.endAt} (cap: ${s.capacity}, booked: ${s.bookedCount})`);
      }
    }

    const { rows: invitations } = await client.query(`
      SELECT id, "workerId", status FROM "InterviewInvitation" WHERE "campaignId" = $1
    `, [c.id]);
    for (const i of invitations) {
      console.log(`      Invitation #${i.id}: worker #${i.workerId} - ${i.status}`);
    }
  }

  // 3. Simulate auto-add query
  console.log('\n=== SIMULATING AUTO-ADD QUERY ===');
  console.log('Looking for: jobId=' + inv.jobId + ', companyId=' + inv.companyId + ', id!=' + inv.campaignId + ', has slots');
  
  const { rows: matchCampaigns } = await client.query(`
    SELECT iic.id, iic.title, iic.status,
           (SELECT COUNT(*) FROM "InterviewInvitationSlot" s WHERE s."campaignId" = iic.id) as slot_count
    FROM "InterviewInvitationCampaign" iic
    WHERE iic."jobId" = $1
      AND iic."companyId" = $2
      AND iic.id != $3
      AND iic.status IN ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED')
      AND EXISTS (SELECT 1 FROM "InterviewInvitationSlot" s WHERE s."campaignId" = iic.id)
    ORDER BY iic."createdAt" DESC
    LIMIT 1
  `, [inv.jobId, inv.companyId, inv.campaignId]);

  if (matchCampaigns.length > 0) {
    console.log('\n✅ FOUND:', matchCampaigns[0]);
  } else {
    console.log('\n❌ NOT FOUND - No matching campaign with slots!');
    console.log('This is why auto-add did not work.');
  }
}

main().catch(console.error).finally(() => client.end());
