import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
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
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateCompanyDto } from './dtos/request/company.update';
import { CompanyReviewDto } from './dtos/request/company.review';

@Controller('company')
@ApiTags('Company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CompanyRegisterDto })
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
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
  async create(
    @Body() body: CompanyRegisterDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[];
      businessLicense?: Express.Multer.File[];
    },
    // @Req() req,
  ) {
    const ownerId = 1;

    return this.companyService.create(body, files, ownerId);
  }

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  findAll() {
    return this.companyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company detail' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id') id: string) {
    return this.companyService.findOne(+id);
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
    const reviewerId = 1; // tạm thời fake user

    return this.companyService.review(+id, body, reviewerId);
  }

@Patch('update/:id')
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
async update(
  @Param('id') id: string,
  @Body() body: UpdateCompanyDto,
  @UploadedFiles()
  files: {
    logo?: Express.Multer.File[];
    businessLicense?: Express.Multer.File[];
  },
) {
  const ownerId = 1; // tạm thời fake user

  return this.companyService.update(+id, body, files, ownerId);
}

}
