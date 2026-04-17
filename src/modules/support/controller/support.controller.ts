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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { EnumUserRole } from 'src/generated/prisma/enums'
import { AuthRoleProtected } from 'src/modules/auth/decorators/auth.jwt.decorator'
import { CreateSupportTicketDto } from '../dtos/create-support-ticket.dto'
import { SupportTicketListDto } from '../dtos/support-ticket-list.dto'
import { UpdateSupportTicketDto } from '../dtos/update-support-ticket.dto'
import { SupportService } from '../service/support.service'

@ApiTags('Support Tickets')
@Controller('support-tickets')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @ApiOperation({ summary: 'Create support ticket' })
  async createTicket(@Body() body: CreateSupportTicketDto) {
    return this.supportService.createTicket(body)
  }

  @Get()
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List support tickets for staff' })
  async listTickets(@Query() query: SupportTicketListDto) {
    return this.supportService.listTickets(query)
  }

  @Patch(':id')
  @AuthRoleProtected(EnumUserRole.ADMIN, EnumUserRole.MANAGER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update support ticket status/assignment' })
  async updateTicket(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSupportTicketDto,
  ) {
    return this.supportService.updateTicket(id, body)
  }
}
