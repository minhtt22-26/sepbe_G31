import { Controller, Get, Patch, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@ApiTags('Notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thông báo thành công' })
  findAll(@Req() req: Request) {
    const userId = (req as any).user?.id ?? 1; // tạm thời fake user

    return this.notificationsService.findAllForUser(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc' })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu thông báo là đã đọc' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  markRead(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.id ?? 1; // tạm thời fake user

    return this.notificationsService.markRead(+id, userId);
  }
}
