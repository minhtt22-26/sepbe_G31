import { PartialType } from '@nestjs/swagger'
import { CreateSectorRequest } from './create-sector.request'

export class UpdateSectorRequest extends PartialType(CreateSectorRequest) { }
