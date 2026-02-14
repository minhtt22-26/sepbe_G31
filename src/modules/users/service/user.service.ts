import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository";
import { UserSignUpRequestDto } from "../dtos/request/user.sign-up.request.dto";
import { AuthUtil } from "src/modules/auth/utils/auth.utils";
import { UserLoginRequestDto } from "../dtos/request/user.login.request.dto";
import { UserLoginResponseDto } from "../dtos/response/user.login.response.dto";
import { EnumUserLoginWith, EnumUserStatus } from "src/generated/prisma/enums";
import { User } from "src/generated/prisma/client";
import { AuthTokenResponseDto } from "src/modules/auth/dto/response/auth.response.token.dto";
import { AuthService } from "src/modules/auth/service/auth.service";
import { HelperService } from "src/common/helper/service/helper.service";
import { SessionService } from "src/modules/session/service/session.service";
import { WorkerProfileRequestDto } from "../dtos/request/user.profile.request.dto";
import { IAuthRefreshTokenPayload } from "src/modules/auth/interfaces/auth.interface";
import { ISessionCreate } from "src/modules/session/interfaces/session.interface";

@Injectable()
export class UserService {
    constructor(
        private readonly authUtil: AuthUtil,
        private readonly authService: AuthService,
        private readonly helperService: HelperService,
        private readonly userRepository: UserRepository,
        private readonly sessionService: SessionService,
    ) { }

    async findOneById(userId: number): Promise<User | null> {
        return this.userRepository.findOneById(userId)
    }

    async signUp(
        {
            userName,
            email,
            password: passwordString,
            ...others
        }: UserSignUpRequestDto) {

        const isExistEmail = email ? await this.userRepository.findUserWithByEmail(email) : null;
        if (isExistEmail) {
            throw new BadRequestException({
                message: "Email already exists"
            })
        }

        const isExistName = userName ? await this.userRepository.findUserWithByUserName(userName) : null;
        if (isExistName) {
            throw new BadRequestException({
                message: "Username already exists"
            })
        }

        const password = this.authUtil.createPassword(passwordString)

        await this.userRepository.signUp(
            {
                userName,
                email,
                password: passwordString,
                ...others
            }, password)
    }

    async loginCrendential(
        {
            email,
            userName,
            password,
        }: UserLoginRequestDto,
        requestLog: { ipAddress: string, userAgent: string }
    ): Promise<UserLoginResponseDto> {

        const user = await this.userRepository.findUserWithUserNameAndEmail({ email, userName })
        if (!user) {
            throw new NotFoundException({
                message: "User not found."
            })
        }

        if (user.status !== EnumUserStatus.ACTIVE) {
            throw new ForbiddenException({
                message: "Inactive account"
            })
        }

        if (!user.password) {
            throw new ForbiddenException({
                message: "Password not created"
            })
        }

        if (this.authUtil.checkPasswordAttempt(user)) {
            throw new ForbiddenException({
                message: "You have entered the password too many times"
            })
        }

        if (!this.authUtil.validatePassword(password, user.password)) {
            await this.userRepository.increasePasswordAttempt(user.id)
            throw new ForbiddenException({
                message: "Password doesn't match"
            })
        }

        await this.userRepository.resetPasswordAttempt(user.id)

        if (this.authUtil.checkPasswordExpired(user.passwordExpired)) {
            throw new ForbiddenException({
                message: "The password has expired"
            })
        }

        return this.handleLogin(
            user,
            EnumUserLoginWith.CREDENTIAL,
            requestLog
        )

    }

    private async handleLogin(
        user: User,
        loginWith: EnumUserLoginWith,
        requestLog: {
            ipAddress: string,
            userAgent: string
        }
    ): Promise<UserLoginResponseDto> {
        const tokens = await this.createTokenAndSession(
            user,
            loginWith,
            requestLog,
        )

        return { tokens }
    }

    private async createTokenAndSession(
        user: User,
        loginWith: EnumUserLoginWith,
        requestLog: {
            ipAddress: string,
            userAgent: string
        }
    ): Promise<AuthTokenResponseDto> {
        const { sessionId, jti, tokens } = this.authService.createTokens(user, loginWith)

        const expiredAt = this.helperService.dateForward(
            this.helperService.dateCreate(), //Today
            { seconds: this.authUtil.jwtRefreshTokenExpirationTimeInSeconds }
        )

        await Promise.all([
            this.sessionService.create({
                id: sessionId,
                userId: user.id,
                jti,
                ipAddress: requestLog.ipAddress,
                userAgent: requestLog.userAgent,
                expiredAt,
            }),
            this.userRepository.login(
                user.id,
                loginWith,
            )
        ])

        return tokens
    }

    async WorkerProfile(
        {
            expectedSalaryMin,
            expectedSalaryMax,
        }: WorkerProfileRequestDto
    ) {
        if (expectedSalaryMin !== undefined && expectedSalaryMax !== undefined
            && expectedSalaryMin > expectedSalaryMax) {
            throw new BadRequestException({
                message: "The minimum expected salary must be less than maximum expected salary."
            })
        }

        //        await this.userRepository.createProfile(user.id, { ...profile })

    }

    async refreshToken(
        user: User,
        refreshToken: string,
        requestLog: {
            ipAddress: string,
            userAgent: string
        }
    ): Promise<AuthTokenResponseDto> {
        const {
            sessionId,
            userId,
            jti: oldJti,
            loginWith,
        } = this.authUtil.payloadToken<IAuthRefreshTokenPayload>(refreshToken)

        // Validate session exists and jti matches
        const session = await this.sessionService.getLogin(userId, sessionId)
        if (!session) {
            throw new UnauthorizedException({
                message: "Session not found or expired"
            })
        }

        if (session.jti !== oldJti) {
            throw new UnauthorizedException({
                message: "Refresh token invalid or tampered"
            })
        }

        // Generate new tokens
        const {
            jti: newJti,
            tokens,
            expiredInMs,
        } = this.authService.refreshTokens(user, refreshToken)

        // Update session with new jti, ipAddress, userAgent in database
        await Promise.all([
            this.sessionService.updateLogin(
                {
                    userId,
                    id: sessionId,
                    jti: newJti,
                    ipAddress: requestLog.ipAddress,
                    userAgent: requestLog.userAgent
                } as ISessionCreate
            ),
            this.userRepository.updateLastActivity(user.id)
        ])

        return tokens
    }

}