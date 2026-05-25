import { Module, Logger } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from './service/email.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('email.host')
        const port = configService.get<number>('email.port')
        const secure = configService.get<boolean>('email.secure')
        const user = configService.get<string>('email.user')
        const from = configService.get<string>('email.from')

        const logger = new Logger('EmailModule')
        if (!host || !user) {
          logger.warn(
            `[EMAIL] SMTP chưa được cấu hình đầy đủ (host=${host || 'MISSING'}, user=${user || 'MISSING'}). Email sẽ không được gửi.`,
          )
        } else {
          logger.log(`[EMAIL] SMTP configured: ${host}:${port} (secure=${secure}) from=${from}`)
        }

        return {
          transport: {
            host,
            port,
            secure,
            auth: {
              user,
              pass: configService.get<string>('email.password'),
            },
            tls: {
              rejectUnauthorized: false,
            },
          },
          defaults: {
            from: `"No Reply" <${from}>`,
          },
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}