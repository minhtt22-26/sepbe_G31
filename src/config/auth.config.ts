import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IAuthConfig {
    jwt: {
        accessToken: {
            secret: string,
            expiresIn: number,
            algorithm: string,
        },

        refreshToken: {
            secret: string,
            expiresIn: number,
            algorithm: string
        },
        audience: string,
        issuer: string,
        header: string,
        prefix: string,
    }

    password: {
        attempt: boolean,
        maxAttempt: number,
        saltLength: number,
        expiredSeconds: number,
        expiredTemporaryInSeconds: number;
        periodInSeconds: number; //không được tái sử dụng mật khẩu cũ"  khoảng tối thiểu giữa các lần thay mật khẩu
    }

    google: {
        header: string,
        prefix: string,
        clientId?: string,
        clientSecret?: string,
    }
}

export default registerAs(
    "auth",
    (): IAuthConfig => ({
        jwt: {
            accessToken: {
                secret: process.env.AUTH_JWT_ACCESS_SECRET as string,
                expiresIn: ms(process.env.AUTH_JWT_ACCESS_TOKEN_EXPIRED as ms.StringValue) / 1000,
                algorithm: "HS256"
            },

            refreshToken: {
                secret: process.env.AUTH_JWT_REFRESH_SECRET as string,
                expiresIn: ms(process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRED as ms.StringValue) / 1000,
                algorithm: "HS512"
            },

            audience: process.env.AUTH_JWT_AUDIENCE as string,
            issuer: process.env.AUTH_JWT_ISSUER as string,
            header: 'Authorization',
            prefix: 'Bearer'
        },

        password: {
            attempt: true,
            maxAttempt: 5,
            saltLength: 8,
            expiredSeconds: ms('2d') / 1000, //182
            expiredTemporaryInSeconds: ms('3d') / 1000, //3
            periodInSeconds: ms('90d') / 1000 //90
        },

        google: {
            header: "Authorization",
            prefix: 'Bearer'
        }
    })
) 