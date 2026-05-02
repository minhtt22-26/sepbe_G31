import { createClient } from 'redis'
import { ConfigService } from '@nestjs/config'
import { Provider } from '@nestjs/common'

export const REDIS_CLIENT = 'REDIS_CLIENT'

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: async (configService: ConfigService) => {
    const redisUrl = configService.getOrThrow<string>('REDIS_URL')
    
    const client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    })

    client.on('error', (err) => console.error('[Redis] Error:', err?.message))

    // await client.connect()
    return client
  },
  inject: [ConfigService],
}
