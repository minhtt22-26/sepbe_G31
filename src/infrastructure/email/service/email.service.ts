import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendForgotPasswordEmail(
    email: string,
    resetLink: string,
    username?: string
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Khôi phục mật khẩu của bạn',
      html: `
        <h1>Khôi phục mật khẩu</h1>
        <p>Hi ${username ?? 'User'},</p>
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
        <p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
      `,
    });
  }
}