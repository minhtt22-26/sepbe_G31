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
  Query,
  Delete,
  ParseIntPipe,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { CompanyService } from './company.service'
import { CompanyRegisterDto } from './dtos/request/company.register'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { UpdateCompanyDto } from './dtos/request/company.update'
import { CompanyReviewDto } from './dtos/request/company.review'
import { CompanyStatus, EnumUserRole } from 'src/generated/prisma/enums'
import {
  AuthJwtAccessProtected,
  AuthJwtPayload,
  AuthRoleProtected,
} from '../auth/decorators/auth.jwt.decorator'
import { CompanySearchDto } from './dtos/request/company.search.request.dto'
import { UpdateReviewReportStatusDto } from './dtos/request/update.review.report.status.dto'
import { ReportStatus } from 'src/generated/prisma/enums'


@Controller('company')
@ApiTags('Company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) { }
  @Post('create')
  @ApiOperation({ summary: 'Create a company' })
  @ApiResponse({ status: 201, description: 'Company created successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CompanyRegisterDto })
  @ApiBearerAuth('access-token')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
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
          ]

          if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(
              new Error('Only JPG, PNG or PDF files are allowed'),
              false,
            )
          }

          callback(null, true)
        },
      },
    ),
  )
  @AuthJwtAccessProtected()
  async create(
    @Body() body: CompanyRegisterDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[]
      businessLicense?: Express.Multer.File[]
    },
    @AuthJwtPayload() user: any,
  ) {
    const ownerId = user.userId
    return this.companyService.create(body, files, ownerId)
  }

  @Get()
  @ApiOperation({ summary: 'List companies' })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  findAll() {
    return this.companyService.findAll()
  }

  @Get('status/:status')
  @AuthRoleProtected(EnumUserRole.EMPLOYER, EnumUserRole.MANAGER)
  @ApiOperation({ summary: 'List companies by status' })
  @ApiParam({
    name: 'status',
    enum: CompanyStatus,
    description: 'Company status',
  })
  @ApiResponse({ status: 200, description: 'Companies retrieved successfully' })
  findAllByStatus(@Param('status') status: CompanyStatus) {
    return this.companyService.findAllByStatus(status)
  }

  @Get('owner')
  @ApiOperation({ summary: 'Get company by owner' })
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  findByOwner(@AuthJwtPayload() user: any) {
    const ownerId = user.userId
    return this.companyService.findByOwnerId(ownerId)
  }

  @Get('search')
  search(@Query() dto: CompanySearchDto) {
    return this.companyService.searchCompanies(dto)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get company detail' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiResponse({ status: 200, description: 'Company retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  findOne(@Param('id') id: string) {
    const companyId = Number(id)
    if (Number.isNaN(companyId)) {
      throw new BadRequestException('Invalid company id')
    }
    return this.companyService.findOne(companyId)
  }

  @Patch('status/:id')
  @AuthRoleProtected(EnumUserRole.MANAGER)
  @ApiOperation({ summary: 'Approve or reject company profile' })
  @ApiParam({ name: 'id', type: Number, description: 'Company ID' })
  @ApiBody({ type: CompanyReviewDto })
  @ApiResponse({ status: 200, description: 'Company status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status request' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  updateStatus(@Param('id') id: string, @Body() body: CompanyReviewDto) {
    return this.companyService.review(+id, body)
  }

  // Alias kept for frontend compatibility
  @Patch('review/:id')
  @AuthRoleProtected(EnumUserRole.MANAGER)
  @ApiOperation({ summary: 'Approve or reject company (alias)' })
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  reviewAlias(@Param('id') id: string, @Body() body: CompanyReviewDto) {
    return this.companyService.review(+id, body)
  }

  // ================= COMPANY REVIEWS =================

  @Post(':id/review')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a review for a company' })
  createReview(
    @Param('id', ParseIntPipe) id: number,
    @AuthJwtPayload('userId') userId: number,
    @Body() dto: any,
  ) {
    return this.companyService.createReview(id, userId, dto)
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get all reviews of a company' })
  getReviews(@Param('id', ParseIntPipe) id: number) {
    return this.companyService.getReviewsByCompanyId(id)
  }

  @Put('reviews/:reviewId')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a review' })
  updateReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @AuthJwtPayload('userId') userId: number,
    @Body() dto: any,
  ) {
    return this.companyService.updateReview(reviewId, userId, dto)
  }

  @Delete('reviews/:reviewId')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a review' })
  deleteReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @AuthJwtPayload('userId') userId: number,
  ) {
    return this.companyService.deleteReview(reviewId, userId)
  }

  @Post('reviews/:reviewId/report')
  @AuthRoleProtected(EnumUserRole.WORKER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Report a review' })
  reportReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @AuthJwtPayload('userId') userId: number,
    @Body() dto: any,
  ) {
    return this.companyService.reportReview(reviewId, userId, dto)
  }

  // ================= MANAGER: REVIEW REPORT MODERATION =================

  @Get('reviews/reports/all')
  @AuthRoleProtected(EnumUserRole.MANAGER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List reported reviews for manager' })
  getReviewReports(
    @Query('status') status?: ReportStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.companyService.getReviewReports(
      status,
      Number(page) || 1,
      Number(limit) || 50,
    )
  }

  @Patch('reviews/reports/:id/status')
  @AuthRoleProtected(EnumUserRole.MANAGER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Manager approves or rejects a review report' })
  updateReviewReportStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReviewReportStatusDto,
  ) {
    return this.companyService.updateReviewReportStatus(
      id,
      dto.status,
      dto.managerNote,
    )
  }

  @Patch('reviews/:reviewId/hide')
  @AuthRoleProtected(EnumUserRole.MANAGER)
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Manager hides an inappropriate review' })
  hideReview(@Param('reviewId', ParseIntPipe) reviewId: number) {
    return this.companyService.hideReviewByManager(reviewId)
  }

  @Put('update/:id')
  @AuthRoleProtected(EnumUserRole.EMPLOYER)
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
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'businessLicense', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
        fileFilter: (req, file, callback) => {
          const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'application/pdf',
          ]

          if (!allowedMimeTypes.includes(file.mimetype)) {
            return callback(
              new Error('Only JPG, PNG or PDF files are allowed'),
              false,
            )
          }

          callback(null, true)
        },
      },
    ),
  )
  @AuthJwtAccessProtected()
  @ApiBearerAuth('access-token')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCompanyDto,
    @UploadedFiles()
    files: {
      logo?: Express.Multer.File[]
      businessLicense?: Express.Multer.File[]
    },
    @AuthJwtPayload() user: any,
  ) {
    const ownerId = user.userId
    return this.companyService.update(+id, body, files, ownerId)
  }
}
