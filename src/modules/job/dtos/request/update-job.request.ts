import { PartialType } from "@nestjs/swagger";
import { CreateJobRequest } from "./create-job.request";

export class UpdateJobRequest extends PartialType(CreateJobRequest) { }