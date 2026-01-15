import { registerAs } from '@nestjs/config'
export const appConfig = registerAs('app', () => ({
  port: Number.parseInt(process.env.APP_PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.APP_API_PREFIX ?? 'api',
}))
