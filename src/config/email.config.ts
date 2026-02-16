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
  (): IEmailConfig => ({
    host: process.env.EMAIL_HOST as string,
    port: parseInt(process.env.EMAIL_PORT!),
    secure: false,
    user: process.env.EMAIL_USER ?? '',
    password: process.env.EMAIL_PASSWORD ?? '',
    from: process.env.EMAIL_FROM ?? 'noreply@example.com',
  })
);