import { Injectable } from "@nestjs/common";
import { compareSync, genSaltSync, hashSync } from "bcryptjs";

@Injectable()
export class HelperService {

    //Date
    //Lấy ngày giờ hiện tại
    dateCreate() {
        return new Date()
    }

    //Thêm 1 khoảng thời gian dựa trên date base
    dateForward(
        date: Date,
        duration: { seconds: number }
    ): Date {
        const result = new Date(date)
        result.setSeconds(result.getSeconds() + duration.seconds)
        return result
    }

    //Dùng object param để truyền vào. return thành object đầu vào
    dateCreateDuration(options: { seconds: number }): { seconds: number } {
        return options
    }


    //Password

    bcryptGenrateSalt(length: number): string {
        return genSaltSync(length)
    }

    bcryptHash(password: string, salt: string): string {
        return hashSync(password, salt)
    }

    bcryptCompare(passwordString: string, passwordHash: string): boolean {
        return compareSync(passwordString, passwordHash)
    }


    //Other
    //Tạo 1 chuỗi random
    randomString(length: number): string {
        let result = ""
        const characters =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            result += characters[Math.floor(Math.random() * characters.length)]
        }

        return result
    }
}