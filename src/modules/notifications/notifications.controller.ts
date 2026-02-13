import { Controller, Get, Patch, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthJwtAccessProtected, AuthJwtPayload } from '../auth/decorators/auth.jwt.decorator';

@Controller('notifications')
@ApiTags('Notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thông báo thành công' })
  @ApiBearerAuth('access-token')
    @AuthJwtAccessProtected()
  async findAll(@AuthJwtPayload() user: any) {
    const userId = user.userId;
    return this.notificationsService.findAllForUser(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu đã đọc' })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Đã đánh dấu thông báo là đã đọc' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  @ApiBearerAuth('access-token')
    @AuthJwtAccessProtected()
  markRead(@Param('id') id: string, @AuthJwtPayload() user: any) {
    const userId = user.userId;

    return this.notificationsService.markRead(+id, userId);
  }
}
