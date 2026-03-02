import { PartialType } from '@nestjs/swagger'
import { CreateOccupationRequest } from './create-occupation.request'

export class UpdateOccupationRequest extends PartialType(CreateOccupationRequest) { }
