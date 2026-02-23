import { Module } from "@nestjs/common";
import { UserController } from "./controller/user.controller";
import { UserService } from "./service/user.service";
import { UserRepository } from "./repositories/user.repository";
import { AuthModule } from "../auth/auth.module";
import { HelperModule } from "src/common/helper/helper.module";
import { SessionModule } from "../session/session.module";
import { EmailModule } from "../../infrastructure/email/email.module";

@Module({
    imports: [AuthModule, HelperModule, SessionModule, EmailModule],
    controllers: [UserController],
    providers: [UserService, UserRepository],
    exports: [UserModule]
})

export class UserModule { }