import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CloudinaryModule } from 'src/infrastructure/cloudinary/cloudinary.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from 'src/infrastructure/redis/redis.module';

@Module({
  imports: [CloudinaryModule, AuthModule, RedisModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule { }
