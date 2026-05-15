const latestInvitationByWorker = new Map();
latestInvitationByWorker.set(1, { workerId: 1, status: 'REJECTED', selectedSlotId: null });

const interviewStatus = 'ACCEPTED';
const slotId = 'ALL';

const filteredWorkerIds = [];
for (const [workerId, inv] of latestInvitationByWorker.entries()) {
  let match = true;
  if (interviewStatus && interviewStatus !== 'ALL') {
    match = inv.status === interviewStatus;
  }
  if (match && slotId && slotId !== 'ALL') {
    match = inv.selectedSlotId === parseInt(slotId);
  }
  if (match) {
    filteredWorkerIds.push(workerId);
  }
}

console.log('Filtered worker IDs:', filteredWorkerIds);
