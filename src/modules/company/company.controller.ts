import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseInterceptors,
  UploadedFiles,
  Put,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CompanyRegisterDto } from './dtos/request/company.register';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateCompanyDto } from './dtos/request/company.update';
import { CompanyReviewDto } from './dtos/request/company.review';
import { CompanyStatus } from 'src/generated/prisma/enums';
import { AuthJwtAccessProtected, AuthJwtPayload } from '../auth/decorators/auth.jwt.decorator';

@Controller('company')
@ApiTags('Company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CompanyRegisterDto })
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'businessLicense', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
        },
        fileFilter: (req, file, callback) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'application/pdf',
          ];

          if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(
              new Error('Only JPG, PNG or PDF files are allowed'),
              false,
            );
          }

          callback(null, true);
        },
      },
    ),
  )
  @AuthJwtAccessProtected()
  async create(
    @Body() body: CompanyRegisterDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      businessLicense?: Express.Multer.File[];
    },
    @AuthJwtPayload() user: any
  ) {
    const ownerId = user.userId;
    return this.companyService.create(body, files, ownerId);
  }

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  findAll() {
    return this.companyService.findAll();
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'List companies by status' })
  @ApiParam({
    name: 'status',
    enum: CompanyStatus,
    description: 'Company status',
  })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  findAllByStatus(@Param('status') status: CompanyStatus) {
    return this.companyService.findAllByStatus(status);
  }

  @Get('owner')
  @ApiOperation({ summary: 'Get company by owner' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  findByOwner(@AuthJwtPayload() user: any) {
    const ownerId = user.userId;
    return this.companyService.findByOwnerId(ownerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company detail' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id') id: string) {
    const companyId = Number(id);
    if (Number.isNaN(companyId)) {
      throw new BadRequestException('Invalid company id');
    }
    return this.companyService.findOne(companyId);
  }

  @Patch('review/:id')
  @ApiOperation({ summary: 'Approve or reject company' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiBody({ type: CompanyReviewDto })
  @ApiResponse({ status: 200, description: 'Company review updated' })
  @ApiResponse({ status: 400, description: 'Invalid review request' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  review(
    @Param('id') id: string,
    @Body() body: CompanyReviewDto,
  ) {

    return this.companyService.review(+id, body );
  }

@Put('update/:id')
@ApiOperation({ summary: 'Update company' })
@ApiConsumes('multipart/form-data')
@ApiParam({
  name: 'id',
  type: Number,
  description: 'Company ID',
})
@ApiBody({ type: UpdateCompanyDto })
@ApiResponse({ status: 200, description: 'Company updated successfully' })
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'logo', maxCount: 1 },
    { name: 'businessLicense', maxCount: 1 },
  ]),
)
@AuthJwtAccessProtected()
@ApiBearerAuth('access-token')

async update(
  @Param('id') id: string,
  @Body() body: UpdateCompanyDto,
  @UploadedFiles()
  files: {
    logo?: Express.Multer.File[];
    businessLicense?: Express.Multer.File[];
  },
  @AuthJwtPayload() user: any
) {
  const ownerId = user.userId;
  return this.companyService.update(+id, body, files, ownerId);
}

}
