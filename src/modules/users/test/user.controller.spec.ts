import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../controller/user.controller';
import { UserService } from '../service/user.service';
import { UserSignUpRequestDto } from '../dtos/request/user.sign-up.request.dto';
import { UserLoginRequestDto } from '../dtos/request/user.login.request.dto';
import { EnumUserLoginWith, EnumUserRole } from 'src/generated/prisma/enums';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from 'src/modules/auth/service/auth.service';
import { AuthUtil } from 'src/modules/auth/utils/auth.utils';
import { HelperService } from 'src/common/helper/service/helper.service';

describe('UserController', () => {
    let controller: UserController;
    let userService: UserService;

    const mockUserService = {
        signUp: jest.fn(),
        loginCrendential: jest.fn(),
        getUserById: jest.fn(),
        refreshToken: jest.fn(),
        forgotPassword: jest.fn(),
        resetPassword: jest.fn(),
        loginWithSocial: jest.fn(),
        createWorkerProfile: jest.fn(),
        updateWorkerProfile: jest.fn(),
        getWorkerProfile: jest.fn(),
        updateInfoUser: jest.fn(),
        logout: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                { provide: UserService, useValue: mockUserService },
                { provide: AuthService, useValue: {} },
                { provide: AuthUtil, useValue: {} },
                { provide: HelperService, useValue: {} },
            ],
        }).compile();

        controller = module.get<UserController>(UserController);
        userService = module.get<UserService>(UserService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // --- 1. Authentication ---
    describe('signUp', () => {
        const signUpDto: UserSignUpRequestDto = {
            fullName: 'Test',
            userName: 'test',
            email: 't@e.com',
            password: 'p',
            role: EnumUserRole.WORKER,
        };
        it('Normal: should call service.signUp', async () => {
            mockUserService.signUp.mockResolvedValue(undefined);
            await controller.signUp(signUpDto);
            expect(userService.signUp).toHaveBeenCalledWith(signUpDto);
        });
        it('Abnormal: should propagate service error', async () => {
            mockUserService.signUp.mockRejectedValue(new BadRequestException());
            await expect(controller.signUp(signUpDto)).rejects.toThrow(BadRequestException);
        });
        it('Boundary: should handle minimal data', async () => {
            mockUserService.signUp.mockResolvedValue(undefined);
            const minimal = { fullName: 'M', role: EnumUserRole.WORKER } as any;
            await controller.signUp(minimal);
            expect(userService.signUp).toHaveBeenCalledWith(minimal);
        });
    });

    describe('loginWithCredential', () => {
        const loginDto = { email: 't@e.com', password: 'p' };
        const req = { ip: '1.1', headers: { 'user-agent': 'a' } } as any;
        it('Normal: should login successfully', async () => {
            mockUserService.loginCrendential.mockResolvedValue({ tokens: {} });
            await controller.loginWithCredential(loginDto, req);
            expect(userService.loginCrendential).toHaveBeenCalled();
        });
        it('Abnormal: should handle unauthorized', async () => {
            mockUserService.loginCrendential.mockRejectedValue(new UnauthorizedException());
            await expect(controller.loginWithCredential(loginDto, req)).rejects.toThrow(UnauthorizedException);
        });
        it('Boundary: should handle missing request info', async () => {
            mockUserService.loginCrendential.mockResolvedValue({});
            await controller.loginWithCredential(loginDto, { headers: {} } as any);
            expect(userService.loginCrendential).toHaveBeenCalledWith(loginDto, { ipAddress: '', userAgent: '' });
        });
    });

    describe('refreshToken', () => {
        it('Normal: should refresh tokens', async () => {
            mockUserService.getUserById.mockResolvedValue({ id: 1 });
            mockUserService.refreshToken.mockResolvedValue({ accessToken: 'a' });
            const result = await controller.refreshToken({ userId: 1 } as any, 'token', { ip: '1.1', headers: {} } as any);
            expect(result).toEqual({ accessToken: 'a' });
        });
        it('Abnormal: should handle user not found', async () => {
            mockUserService.getUserById.mockResolvedValue(null);
            await controller.refreshToken({ userId: 1 } as any, 'token', { headers: {} } as any);
            expect(userService.refreshToken).toHaveBeenCalledWith(null, 'token', expect.any(Object));
        });
    });

    // --- 2. Password Management ---
    describe('forgotPassword', () => {
        it('Normal: should delegate to service', async () => {
            await controller.forgotPassword({ email: 'e' }, { headers: {} } as any);
            expect(userService.forgotPassword).toHaveBeenCalled();
        });
        it('Abnormal: should handle service error', async () => {
            mockUserService.forgotPassword.mockRejectedValue(new BadRequestException());
            await expect(controller.forgotPassword({ email: 'e' }, { headers: {} } as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('resetPassword', () => {
        it('Normal: should delegate to service', async () => {
            await controller.resetPassword({ token: 't', newPassword: 'p' }, { headers: {} } as any);
            expect(userService.resetPassword).toHaveBeenCalled();
        });
        it('Abnormal: should handle service error', async () => {
            mockUserService.resetPassword.mockRejectedValue(new BadRequestException());
            await expect(controller.resetPassword({ token: 't', newPassword: 'p' }, { headers: {} } as any)).rejects.toThrow(BadRequestException);
        });
    });

    // --- 3. Worker Profile ---
    describe('createWorkerProfile', () => {
        it('Normal: should create profile', async () => {
            mockUserService.createWorkerProfile.mockResolvedValue({ id: 1 });
            await controller.createWorkerProfile(1, {} as any);
            expect(userService.createWorkerProfile).toHaveBeenCalledWith(1, {});
        });
        it('Abnormal: should handle already exists', async () => {
            mockUserService.createWorkerProfile.mockRejectedValue(new BadRequestException('Exists'));
            await expect(controller.createWorkerProfile(1, {} as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('updateWorkerProfile', () => {
        it('Normal: should update profile', async () => {
            mockUserService.updateWorkerProfile.mockResolvedValue({ id: 1 });
            await controller.updateWorkerProfile(1, {} as any);
            expect(userService.updateWorkerProfile).toHaveBeenCalledWith(1, {});
        });
        it('Abnormal: should handle not found', async () => {
            mockUserService.updateWorkerProfile.mockRejectedValue(new NotFoundException());
            await expect(controller.updateWorkerProfile(1, {} as any)).rejects.toThrow(NotFoundException);
        });
    });

    describe('getWorkerProfile', () => {
        it('Normal: should return profile', async () => {
            mockUserService.getWorkerProfile.mockResolvedValue({ id: 1 });
            const result = await controller.getWorkerProfile(1);
            expect(result).toEqual({ id: 1 });
        });
        it('Abnormal: should handle not found', async () => {
            mockUserService.getWorkerProfile.mockRejectedValue(new NotFoundException());
            await expect(controller.getWorkerProfile(1)).rejects.toThrow(NotFoundException);
        });
    });

    // --- 4. User Info ---
    describe('getUserInfo', () => {
        it('Normal: should return user info', async () => {
            mockUserService.getUserById.mockResolvedValue({ id: 1 });
            const result = await controller.getUserInfo(1);
            expect(result).toEqual({ id: 1 });
        });
        it('Abnormal: should handle user not found', async () => {
            mockUserService.getUserById.mockRejectedValue(new NotFoundException());
            await expect(controller.getUserInfo(1)).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateInfoUser', () => {
        it('Normal: should update user info', async () => {
            mockUserService.updateInfoUser.mockResolvedValue({ id: 1 });
            await controller.updateInfoUser(1, {} as any);
            expect(userService.updateInfoUser).toHaveBeenCalledWith(1, {});
        });
        it('Abnormal: should handle error', async () => {
            mockUserService.updateInfoUser.mockRejectedValue(new BadRequestException());
            await expect(controller.updateInfoUser(1, {} as any)).rejects.toThrow(BadRequestException);
        });
    });

    // --- 5. Others ---
    describe('logout', () => {
        it('Normal: should call logout service', async () => {
            await controller.logout(1, 's', { headers: {} } as any);
            expect(userService.logout).toHaveBeenCalled();
        });
    });

    describe('loginWithGoogle', () => {
        it('Normal: should call social login service', async () => {
            await controller.loginWithGoogle('e', {} as any, { headers: {} } as any);
            expect(userService.loginWithSocial).toHaveBeenCalled();
        });
        it('Abnormal: should handle forbidden', async () => {
            mockUserService.loginWithSocial.mockRejectedValue(new ForbiddenException());
            await expect(controller.loginWithGoogle('e', {} as any, { headers: {} } as any)).rejects.toThrow(ForbiddenException);
        });
    });
});
