import { Prisma } from 'src/generated/prisma/client'

export type WorkerProfileWithOccupation = Prisma.WorkerProfileGetPayload<{
  include: { occupation: true }
}>
