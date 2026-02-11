import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EnumUserLoginWith, User } from "src/generated/prisma/client";
import { IAuthAccessTokenPayload, IAuthPassword, IAuthRefreshTokenPayload } from "../interfaces/auth.interface";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { HelperService } from "src/common/helper/service/helper.service";
import { Algorithm } from "jsonwebtoken";

@Injectable()
export class AuthUtil {

    //JWT
    private readonly jwtAccessTokenSecret: string;
    readonly jwtAccessTokenExpirationTimeInSeconds: number;
    private readonly jwtAccessTokenAlgorithm: Algorithm;

    private readonly jwtRefreshTokenSecret: string;
    readonly jwtRefreshTokenExpirationTimeInSeconds: number;
    private readonly jwtRefreshTokenAlgorithm: Algorithm;

    private readonly jwtAudience: string;
    private readonly jwtIssuer: string;
    private readonly jwtHeader: string;
    readonly jwtPrefix: string;

    //Password
    private readonly passwordAttempt: boolean;
    private readonly passwordMaxAttempt: number;
    private readonly passwordSaltLength: number;
    private readonly passwordExpiredInSeconds: number;
    private readonly passwordExpiredTemporaryInSeconds: number;
    private readonly passwordPeriodInSeconds: number;



    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly helperService: HelperService,
    ) {
        this.jwtAccessTokenSecret = this.configService.get<string>('auth.jwt.accessToken.secret')!;
        this.jwtAccessTokenExpirationTimeInSeconds = this.configService.get<number>('auth.jwt.accessToken.expiresIn')!
        this.jwtAccessTokenAlgorithm = this.configService.get<Algorithm>('auth.jwt.accessToken.algorithm')!
        this.jwtRefreshTokenSecret = this.configService.get<string>("auth.jwt.refreshToken.secret")!
        this.jwtRefreshTokenExpirationTimeInSeconds = this.configService.get<number>("auth.jwt.refreshToken.expiresIn")!
        this.jwtRefreshTokenAlgorithm = this.configService.get<Algorithm>("auth.jwt.refreshToken.algorithm")!
        this.jwtAudience = this.configService.get<string>("auth.jwt.audience")!
        this.jwtIssuer = this.configService.get<string>("auth.jwt.issuer")!
        this.jwtHeader = this.configService.get<string>("auth.jwt.header")!
        this.jwtPrefix = this.configService.get<string>("auth.jwt.prefix")!

        //password
        this.passwordAttempt = this.configService.get<boolean>('auth.password.attempt')!
        this.passwordMaxAttempt = this.configService.get<number>('auth.password.maxAttempt')!
        this.passwordSaltLength = this.configService.get<number>('auth.password.saltLength')!
        this.passwordExpiredInSeconds = this.configService.get<number>('auth.password.expiredSeconds')!
        this.passwordExpiredTemporaryInSeconds = this.configService.get<number>('auth.password.expiredTemporaryInSeconds')!
        this.passwordPeriodInSeconds = this.configService.get<number>('auth.password.periodInSeconds')!
    }

    //JWT

    createAccessTokenPayload(
        data: User,
        sessionId: string,
        lastLoginAt: Date,
        loginWith: EnumUserLoginWith
    ): IAuthAccessTokenPayload {
        return {
            userId: data.id,
            sessionId,
            email: data.email ?? undefined,
            username: data.fullName,
            lastLoginAt,
            loginWith,
            role: data.role
        }
    }

    createRefreshTokenPayload({
        userId,
        sessionId,
        lastLoginAt,
        loginWith
    }: IAuthRefreshTokenPayload): IAuthRefreshTokenPayload {
        return {
            userId,
            sessionId,
            lastLoginAt,
            loginWith
        }
    }

    createAccessTokens(
        jti: string,
        payload: IAuthAccessTokenPayload,
    ): string {
        return this.jwtService.sign(payload, {
            secret: this.jwtAccessTokenSecret,
            expiresIn: this.jwtAccessTokenExpirationTimeInSeconds,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            algorithm: this.jwtAccessTokenAlgorithm,
            jwtid: jti
        } as JwtSignOptions)
    }

    createRefreshTokens(
        jti: string,
        payload: IAuthRefreshTokenPayload
    ): string {
        return this.jwtService.sign(payload, {
            secret: this.jwtRefreshTokenSecret,
            expiresIn: this.jwtRefreshTokenExpirationTimeInSeconds,
            audience: this.jwtAudience,
            issuer: this.jwtIssuer,
            algorithm: this.jwtRefreshTokenAlgorithm,
            jwtid: jti,
        } as JwtSignOptions)
    }


    //Password

    //Password Hash
    createPassword(password: string): IAuthPassword {
        const today = this.helperService.dateCreate()
        const salt = this.helperService.bcryptGenrateSalt(this.passwordSaltLength)

        const passwordExpired: Date = this.helperService.dateForward(
            today,
            this.helperService.dateCreateDuration({
                seconds: this.passwordExpiredInSeconds
            })
        )

        const passwordHash = this.helperService.bcryptHash(password, salt)

        const passwordPeriodExpired: Date = this.helperService.dateForward(
            today,
            this.helperService.dateCreateDuration({
                seconds: this.passwordPeriodInSeconds
            })
        )

        return {
            passwordHash,
            passwordExpired,
            passwordCreated: today,
            passwordPeriodExpired,
        }
    }

    checkPasswordAttempt(user: User): boolean {
        return this.passwordAttempt ?
            user.passwordAttempt >= this.passwordMaxAttempt : false
    }

    validatePassword(passwordString: string, passWordHash: string): boolean {
        return this.helperService.bcryptCompare(passwordString, passWordHash)
    }

    checkPasswordExpired(passwordExpired: Date | null): boolean {
        if (!passwordExpired) return false
        const today = new Date()
        return today > passwordExpired
    }

}