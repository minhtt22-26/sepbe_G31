import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator'
import { ChatService } from '../service/chat.service'
import { ChatConversationRequestDto } from '../dtos/request/chat.create.request.dto'
import { ChatSendMessageRequestDto } from '../dtos/request/chat.send-message.request.dto'
import { ChatGetMessageRequestDto } from '../dtos/request/chat.get-message.request.dto'

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @AuthJwtAccessProtected()
  async getOrCreateConversation(
    @AuthJwtPayload('userId') userId: number,
    @Body() dto: ChatConversationRequestDto,
  ) {
    return await this.chatService.getOrCreateConversation(userId, dto)
  }

  @Get('conversations')
  @AuthJwtAccessProtected()
  async getUserConversations(@AuthJwtPayload('userId') userId: number) {
    return await this.chatService.getUserConversations(userId)
  }

  @Post('conversations/:id/messages')
  @AuthJwtAccessProtected()
  async sendMessage(
    @AuthJwtPayload('userId') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: ChatSendMessageRequestDto,
  ) {
    return await this.chatService.sendMessage(conversationId, userId, dto)
  }

  @Get('conversations/:id/messages')
  @AuthJwtAccessProtected()
  async getMessages(
    @AuthJwtPayload('userId') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
    @Query() query: ChatGetMessageRequestDto,
  ) {
    return await this.chatService.getMessages(userId, conversationId, query)
  }

  @Patch('conversations/:id/read')
  @AuthJwtAccessProtected()
  async markAsRead(
    @AuthJwtPayload('userId') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    await this.chatService.markAsRead(userId, conversationId)
    return { success: true }
  }
}
