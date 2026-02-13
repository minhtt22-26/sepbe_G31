import { PartialType } from '@nestjs/swagger';
import { CompanyRegisterDto } from './company.register';

export class UpdateCompanyDto extends PartialType(CompanyRegisterDto) {}
