import { Body, Controller, Get, Post } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty } from 'class-validator'
import { EmailQueueService } from 'src/infrastructure/queue/email/service/email-queue.service'

export class ForgotPasswordQueueTestDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string
}

@ApiTags('Queue Test')
@Controller('queue-test')
export class QueueTestController {
  constructor(private readonly emailQueueService: EmailQueueService) {}

  @Post('forgot-password')
  @ApiOperation({ summary: 'Test gửi email forgot-password qua queue' })
  async testForgotPasswordEmail(@Body() body: ForgotPasswordQueueTestDto) {
    try {
      const resetLink = 'http://localhost:3000/reset-password?token=TEST_TOKEN_123'
      const html = `
        <h1>Khôi phục mật khẩu</h1>
        <p>Hi User,</p>
        <p>Bạn đã yêu cầu khôi phục mật khẩu. Vui lòng click vào liên kết bên dưới:</p>
        <a href="${resetLink}" style="
          display: inline-block;
          padding: 12px 24px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
        ">Khôi phục mật khẩu</a>
        <p>Liên kết này sẽ hết hạn sau 15 phút.</p>
        <p>Đây là email test từ Queue — không cần thao tác gì thêm.</p>
      `
      const job = await this.emailQueueService.addSendEmailJob({
        to: body.email,
        subject: '[TEST] Khôi phục mật khẩu của bạn',
        html,
      })

      return {
        success: true,
        message: 'Email job đã được thêm vào queue thành công',
        jobId: job.id,
        to: body.email,
      }
    } catch (error) {
      return { success: false, message: error?.message }
    }
  }

  @Post('send-email')
  @ApiOperation({ summary: 'Test thêm 1 email bất kỳ vào queue' })
  async testSendEmail() {
    try {
      const job = await this.emailQueueService.addSendEmailJob({
        to: 'test@example.com',
        subject: 'Test Email from Queue',
        html: '<h1>Hello Queue!</h1><p>Email này được gửi qua Bull queue.</p>',
      })
      return { success: true, message: 'Email job đã thêm vào queue', jobId: job.id }
    } catch (error) {
      return { success: false, message: error?.message }
    }
  }

  @Get('queue-stats')
  @ApiOperation({ summary: 'Xem trạng thái queue (waiting / active / completed / failed)' })
  async getQueueStats() {
    try {
      const stats = await this.emailQueueService.getQueueStats()
      return { success: true, stats }
    } catch (error) {
      return { success: false, message: error?.message }
    }
  }
}
