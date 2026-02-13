import { BadRequestException, Injectable } from "@nestjs/common";

@Injectable()
export class SessionUtil {
    toNumberId(id: number | string): number {
        const val = Number(id)

        if (isNaN(val)) {
            throw new BadRequestException('Invalid ID')
        }

        return val
    }
}