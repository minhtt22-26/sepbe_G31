import { Controller, Post, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { EmailQueueService } from 'src/infrastructure/queue/services/email-queue.service'

@ApiTags('Queue Test')
@Controller('api/queue-test')
export class QueueTestController {
  constructor(private readonly emailQueueService: EmailQueueService) {}

  @Post('send-email')
  @ApiOperation({ summary: 'Add single email to queue' })
  @ApiResponse({
    status: 200,
    description: 'Email job added successfully',
  })
  async testSendEmail() {
    try {
      const job = await this.emailQueueService.addSendEmailJob({
        to: 'test@example.com',
        subject: 'Test Email from Queue',
        html: '<h1>Hello Queue!</h1>',
      })

      return {
        success: true,
        message: 'Email job added to queue',
        jobId: job.id,
      }
    } catch (error) {
      return {
        success: false,
        message: error?.message,
      }
    }
  }

  @Get('queue-stats')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue stats returned',
  })
  async getQueueStats() {
    try {
      const stats = await this.emailQueueService.getQueueStats()
      return {
        success: true,
        stats,
      }
    } catch (error) {
      return {
        success: false,
        message: error?.message,
      }
    }
  }

  @Post('send-bulk-emails')
  @ApiOperation({ summary: 'Add multiple emails to queue' })
  @ApiResponse({
    status: 200,
    description: 'Multiple email jobs added',
  })
  async testBulkEmails() {
    try {
      const emails = [
        { to: 'user1@example.com', name: 'User 1' },
        { to: 'user2@example.com', name: 'User 2' },
      ]

      const jobs = await Promise.all(
        emails.map((email) =>
          this.emailQueueService.addSendEmailJob({
            to: email.to,
            subject: `Welcome ${email.name}!`,
            html: `<h1>Hello ${email.name}</h1>`,
          }),
        ),
      )

      return {
        success: true,
        message: `${jobs.length} email jobs added`,
        jobIds: jobs.map((j) => j.id),
      }
    } catch (error) {
      return {
        success: false,
        message: error?.message,
      }
    }
  }
}
