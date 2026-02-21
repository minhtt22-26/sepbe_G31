import { PartialType } from '@nestjs/mapped-types';
import { CreateJobRequest } from './create-job.request';

export class UpdateJobRequest extends PartialType(CreateJobRequest) { }