import { Test, TestingModule } from '@nestjs/testing'
import { ChatGateway } from './chat.gateway'

describe('ChatGateway', () => {
  let gateway: ChatGateway

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGateway],
    }).compile()
    gateway = module.get<ChatGateway>(ChatGateway)
    // Inject mock server
    ;(gateway as any).server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    }
  })

  function makeSocket(id = 'socket-1') {
    return {
      id,
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as any
  }

  it('handleConnection logs client id', () => {
    const logSpy = jest.spyOn((gateway as any).logger, 'log').mockImplementation(() => {})
    gateway.handleConnection(makeSocket('abc'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('abc'))
  })

  it('handleDisconnect logs client id', () => {
    const logSpy = jest.spyOn((gateway as any).logger, 'log').mockImplementation(() => {})
    gateway.handleDisconnect(makeSocket('xyz'))
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('xyz'))
  })

  it('handleJoin adds socket to conversation room', () => {
    const client = makeSocket()
    const result = gateway.handleJoin(client, 5)
    expect(client.join).toHaveBeenCalledWith('conv_5')
    expect(result).toEqual({ event: 'joined', data: 5 })
  })

  it('handleLeave removes socket from conversation room', () => {
    const client = makeSocket()
    gateway.handleLeave(client, 3)
    expect(client.leave).toHaveBeenCalledWith('conv_3')
  })

  it('handleTyping broadcasts typing event to room', () => {
    const client = makeSocket()
    gateway.handleTyping(client, { conversationId: 10, userId: 2, isTyping: true })
    expect(client.to).toHaveBeenCalledWith('conv_10')
    const emitMock = client.to.mock.results[0].value.emit
    expect(emitMock).toHaveBeenCalledWith('typing', { userId: 2, isTyping: true })
  })

  it('broadcastMessage emits new_message to conversation room', () => {
    const message: any = { id: 1, content: 'Hello' }
    gateway.broadcastMessage(7, message)
    expect((gateway as any).server.to).toHaveBeenCalledWith('conv_7')
    const emitMock = (gateway as any).server.to.mock.results[0].value.emit
    expect(emitMock).toHaveBeenCalledWith('new_message', message)
  })
})
