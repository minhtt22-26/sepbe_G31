import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { CompanyService } from '../service/company.service';
import { CompanyRegisterDto } from '../dtos/request/company.register';
import { AuthJwtAccessProtected, AuthJwtPayload } from 'src/modules/auth/decorators/auth.jwt.decorator';
import type { IAuthAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';

@Controller('companies')
@ApiTags('Companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) { }

  @Post('create')
  @ApiOperation({ summary: 'Create a company' })
  @ApiResponse({ status: 201, description: 'Company created' })
  create(@Body() body: CompanyRegisterDto) {
    return this.companyService.create(body);
  }

  @Get()
  @AuthJwtAccessProtected()
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved' })
  findAll(
    @AuthJwtPayload() user: IAuthAccessTokenPayload
  ) {
    console.log(user)

    return this.companyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Company retrieved' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a company' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({ status: 200, description: 'Company updated' })
  update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.companyService.update(Number(id), body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a company' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Company deleted' })
  remove(@Param('id') id: string) {
    return this.companyService.remove(Number(id));
  }
}
