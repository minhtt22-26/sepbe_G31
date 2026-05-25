import { registerAs } from '@nestjs/config';

export interface IEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export default registerAs(
  'email',
  (): IEmailConfig => {
    const rawPort = parseInt(process.env.EMAIL_PORT ?? '587', 10)
    const port = Number.isFinite(rawPort) ? rawPort : 587
    const secure = port === 465

    return {
      host: process.env.EMAIL_HOST ?? '',
      port,
      secure,
      user: process.env.EMAIL_USER ?? '',
      password: process.env.EMAIL_PASSWORD ?? '',
      from: process.env.EMAIL_FROM ?? 'noreply@example.com',
    }
  }
);