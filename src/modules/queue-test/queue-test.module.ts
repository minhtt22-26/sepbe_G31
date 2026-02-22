import { Module } from '@nestjs/common'
import { QueueTestController } from './queue-test.controller'
import { QueueModule } from 'src/infrastructure/queue/queue.module'

@Module({
  imports: [QueueModule],
  controllers: [QueueTestController],
})
export class QueueTestModule {}
