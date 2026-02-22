import { createClient } from 'redis'
import { ConfigService } from '@nestjs/config'

export const REDIS_CLIENT = 'REDIS_CLIENT'

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: async (configService: ConfigService) => {
    const redisUrl = configService.getOrThrow<string>('REDIS_URL')
    
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    })

    client.on('error', (err) => console.log('[Redis] Error:', err?.message))
    client.on('connect', () => console.log('[Redis] ✓ Connected to Redis'))
    client.on('ready', () => console.log('[Redis] ✓ Redis ready'))

    await client.connect()
    return client
  },
  inject: [ConfigService],
}
