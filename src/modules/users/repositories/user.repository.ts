import { Injectable } from "@nestjs/common";
import { EnumUserLoginWith, Prisma, User } from "src/generated/prisma/client";
import { PrismaService } from "src/prisma.service";
import { UserSignUpRequestDto } from "../dtos/request/user.sign-up.request.dto";
import { IAuthPassword } from "src/modules/auth/interfaces/auth.interface";
import { HelperService } from "src/common/helper/service/helper.service";
import { WorkerProfileRequestDto } from "../dtos/request/user.profile.request.dto";

@Injectable()
export class UserRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly helperService: HelperService,
    ) { }

    async findUserWithByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email }
        })
    }

    async findUserWithByUserName(userName: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { userName }
        })
    }

    async findUserWithUserNameAndEmail(
        where: Prisma.UserWhereUniqueInput
    ): Promise<User | null> {
        return this.prisma.user.findUnique({ where })
    }

    async signUp(
        {
            email,
            userName,
            fullName,
            phone,
            role
        }: UserSignUpRequestDto,
        passwordData: IAuthPassword
    ) {
        return this.prisma.user.create({
            data: {
                email,
                userName,
                fullName,
                phone,
                role,
                password: passwordData.passwordHash,
                passwordCreated: passwordData.passwordCreated,
                passwordExpired: passwordData.passwordExpired,
            }
        })
    }

    async login(userId: number, loginWith: EnumUserLoginWith): Promise<void> {
        const dateNow = this.helperService.dateCreate()
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                loginWith,
                lastLoginAt: dateNow
            }
        })
    }

    async increasePasswordAttempt(userId: number): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordAttempt: { increment: 1 }
            }
        })
    }

    async resetPasswordAttempt(userId: number): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                passwordAttempt: { set: 0 }
            }
        })
    }

    async createProfile(
        userId: number,
        {
            ...profile
        }: WorkerProfileRequestDto
    ): Promise<void> {
        await this.prisma.workerProfile.create({
            data: {
                userId,
                sectorId: profile.sectorId,
                occupationId: profile.occupationId,
                address: profile.address,
                province: profile.province,
                district: profile.district,
                gender: profile.gender,
                birthYear: profile.birthYear,
                expectedSalaryMin: profile.expectedSalaryMin,
                expectedSalaryMax: profile.expectedSalaryMax,
                experienceYear: profile.experienceYear,
            }
        })
    }
}