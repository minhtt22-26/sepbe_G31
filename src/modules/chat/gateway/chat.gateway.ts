import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger } from '@nestjs/common'
import type { ChatMessageResponseDto } from '../dtos/response/chat.message.response.dto'

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(ChatGateway.name)

  handleConnection(client: Socket) {
    this.logger.log(`Chat WS connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Chat WS disconnected: ${client.id}`)
  }

  @SubscribeMessage('join_conversation')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() conversationId: number) {
    client.join(`conv_${conversationId}`)
    return { event: 'joined', data: conversationId }
  }

  @SubscribeMessage('leave_conversation')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() conversationId: number) {
    client.leave(`conv_${conversationId}`)
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: number; userId: number; isTyping: boolean },
  ) {
    client.to(`conv_${payload.conversationId}`).emit('typing', {
      userId: payload.userId,
      isTyping: payload.isTyping,
    })
  }

  broadcastMessage(conversationId: number, message: ChatMessageResponseDto) {
    this.server.to(`conv_${conversationId}`).emit('new_message', message)
  }
}
