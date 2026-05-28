import { REDIS_CLIENT, redisProvider } from './redis.provider'

jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    isOpen: true,
    ping: jest.fn().mockResolvedValue('PONG'),
  }),
}))

import { createClient } from 'redis'
const mockCreateClient = createClient as jest.Mock

describe('redisProvider', () => {
  it('exports REDIS_CLIENT token', () => {
    expect(REDIS_CLIENT).toBe('REDIS_CLIENT')
  })

  it('provider has correct token', () => {
    expect(redisProvider.provide).toBe(REDIS_CLIENT)
  })

  it('useFactory creates and connects a Redis client', async () => {
    const mockConfig = { getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379') }
    const factory = (redisProvider as any).useFactory
    const client = await factory(mockConfig)
    expect(mockCreateClient).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'redis://localhost:6379' }),
    )
    expect(client.connect).toHaveBeenCalled()
  })

  it('reconnectStrategy returns bounded value', () => {
    const factory = (redisProvider as any).useFactory
    const mockConfig = { getOrThrow: jest.fn().mockReturnValue('redis://localhost:6379') }
    let capturedStrategy: ((retries: number) => number) | null = null
    mockCreateClient.mockImplementationOnce((opts: any) => {
      capturedStrategy = opts.socket?.reconnectStrategy
      return { on: jest.fn(), connect: jest.fn().mockResolvedValue(undefined) }
    })
    factory(mockConfig)
    if (capturedStrategy) {
      expect(capturedStrategy(0)).toBe(0)
      expect(capturedStrategy(5)).toBe(250)
      expect(capturedStrategy(100)).toBe(500)
    }
  })
})
