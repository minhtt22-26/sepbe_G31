import { createClient } from 'redis'
import { ConfigService } from '@nestjs/config'
import { Logger, Provider } from '@nestjs/common'

export const REDIS_CLIENT = 'REDIS_CLIENT'

const TRANSIENT_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'])

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: async (configService: ConfigService) => {
    const logger = new Logger('RedisClient')
    const redisUrl = configService.getOrThrow<string>('REDIS_URL')

    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 20) {
            logger.error('Redis max reconnect attempts reached')
            return new Error('Redis max reconnect attempts reached')
          }
          return Math.min(retries * 100, 3000)
        },
        keepAlive: 10000,
        connectTimeout: 10000,
      },
    })

    client.on('error', (err) => {
      if (TRANSIENT_CODES.has(err?.code)) {
        logger.warn(`Redis transient error (${err.code}), reconnecting…`)
        return
      }
      logger.error(`Redis error: ${err?.message}`)
    })

    client.on('reconnecting', () => logger.warn('Redis reconnecting…'))
    client.on('ready', () => logger.log('Redis connection ready'))

    await client.connect()
    return client
  },
  inject: [ConfigService],
}
