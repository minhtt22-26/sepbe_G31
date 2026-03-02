import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../service/user.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthUtil } from 'src/modules/auth/utils/auth.utils';
import { AuthService } from 'src/modules/auth/service/auth.service';
import { HelperService } from 'src/common/helper/service/helper.service';
import { SessionService } from 'src/modules/session/service/session.service';
import { EmailService } from 'src/infrastructure/email/service/email.service';
import { UserSignUpRequestDto } from '../dtos/request/user.sign-up.request.dto';
import { EnumUserLoginWith, EnumUserRole, EnumUserStatus } from 'src/generated/prisma/enums';
import { BadRequestException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('UserService', () => {
    let service: UserService;
    let userRepository: UserRepository;
    let authUtil: AuthUtil;
    let sessionService: SessionService; // Added for new tests

    const mockUserRepository = {
        findUserWithByEmail: jest.fn(),
        findUserWithByUserName: jest.fn(),
        signUp: jest.fn(),
        findUserWithUserNameOrEmail: jest.fn(),
        increasePasswordAttempt: jest.fn(),
        resetPasswordAttempt: jest.fn(),
        login: jest.fn(),
        getWorkerProfile: jest.fn(),
        createProfile: jest.fn(),
        updateProfile: jest.fn(),
        updateInfoUser: jest.fn(),
        findOneById: jest.fn(),
        updateLastActivity: jest.fn(),
        createBySocial: jest.fn(),
        findLatestForgotPasswordRequest: jest.fn(),
        createForgotPasswordToken: jest.fn(),
        findValidForgotPasswordToken: jest.fn(),
        updatePassword: jest.fn(),
        markForgotPasswordTokenUsed: jest.fn(),
    };

    const mockAuthUtil = {
        createPassword: jest.fn(),
        validatePassword: jest.fn(),
        checkPasswordAttempt: jest.fn(),
        checkPasswordExpired: jest.fn(),
        payloadToken: jest.fn(),
        createForgotPassword: jest.fn(),
        jwtRefreshTokenExpirationTimeInSeconds: 3600,
        forgotPasswordResendMinutes: 5,
    };

    const mockAuthService = {
        createTokens: jest.fn(),
        refreshTokens: jest.fn(),
    };
    const mockHelperService = {
        dateCreate: jest.fn(),
        dateForward: jest.fn(),
        dateCreateDuration: jest.fn(),
    };
    const mockSessionService = {
        create: jest.fn(),
        getLogin: jest.fn(),
        updateLogin: jest.fn(),
        revoke: jest.fn(),
    };
    const mockEmailService = {
        sendForgotPasswordEmail: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: UserRepository, useValue: mockUserRepository },
                { provide: AuthUtil, useValue: mockAuthUtil },
                { provide: AuthService, useValue: mockAuthService },
                { provide: HelperService, useValue: mockHelperService },
                { provide: SessionService, useValue: mockSessionService },
                { provide: EmailService, useValue: mockEmailService },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
        userRepository = module.get<UserRepository>(UserRepository);
        authUtil = module.get<AuthUtil>(AuthUtil);
        sessionService = module.get<SessionService>(SessionService); // Added for new tests
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('signUp', () => {
        const signUpDto: UserSignUpRequestDto = {
            fullName: 'Test User',
            userName: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            role: EnumUserRole.WORKER,
        };

        const mockPassword = {
            passwordHash: 'hashed_password',
            passwordExpired: new Date(),
            passwordCreated: new Date(),
        };

        it('Normal: should successfully sign up a user when email and username are unique', async () => {
            // Setup mocks
            mockUserRepository.findUserWithByEmail.mockResolvedValue(null);
            mockUserRepository.findUserWithByUserName.mockResolvedValue(null);
            mockAuthUtil.createPassword.mockReturnValue(mockPassword);
            mockUserRepository.signUp.mockResolvedValue(undefined);

            // Execute
            await service.signUp(signUpDto);

            // Verify
            expect(userRepository.findUserWithByEmail).toHaveBeenCalledWith(signUpDto.email);
            expect(userRepository.findUserWithByUserName).toHaveBeenCalledWith(signUpDto.userName);
            expect(authUtil.createPassword).toHaveBeenCalledWith(signUpDto.password);
            expect(userRepository.signUp).toHaveBeenCalledWith(signUpDto, mockPassword);
        });

        it('Abnormal: should throw BadRequestException when email already exists', async () => {
            // Setup mocks
            mockUserRepository.findUserWithByEmail.mockResolvedValue({ id: 1, email: signUpDto.email });

            // Execute & Verify
            await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
            await expect(service.signUp(signUpDto)).rejects.toThrow('Email này đã được sử dụng rồi');

            expect(userRepository.findUserWithByEmail).toHaveBeenCalledWith(signUpDto.email);
            expect(userRepository.findUserWithByUserName).not.toHaveBeenCalled();
            expect(userRepository.signUp).not.toHaveBeenCalled();
        });

        it('Boundary: should throw BadRequestException when username already exists', async () => {
            // Setup mocks
            mockUserRepository.findUserWithByEmail.mockResolvedValue(null);
            mockUserRepository.findUserWithByUserName.mockResolvedValue({ id: 1, userName: signUpDto.userName });

            // Execute & Verify
            await expect(service.signUp(signUpDto)).rejects.toThrow(BadRequestException);
            await expect(service.signUp(signUpDto)).rejects.toThrow('Tên đăng nhập này đã có người dùng');

            expect(userRepository.findUserWithByEmail).toHaveBeenCalledWith(signUpDto.email);
            expect(userRepository.findUserWithByUserName).toHaveBeenCalledWith(signUpDto.userName);
            expect(userRepository.signUp).not.toHaveBeenCalled();
        });
    });

    describe('loginCrendential', () => {
        const loginDto = {
            email: 'test@example.com',
            password: 'password123',
        };

        const mockUser = {
            id: 1,
            email: 'test@example.com',
            password: 'hashed_password',
            status: EnumUserStatus.ACTIVE,
            passwordExpired: new Date(Date.now() + 100000),
        };

        const requestLog = {
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        };

        it('Normal: should successfully login with valid credentials', async () => {
            // Setup mocks
            mockUserRepository.findUserWithUserNameOrEmail.mockResolvedValue(mockUser);
            mockAuthUtil.checkPasswordAttempt.mockReturnValue(false);
            mockAuthUtil.validatePassword.mockReturnValue(true);
            mockAuthUtil.checkPasswordExpired.mockReturnValue(false);

            const mockTokens = { accessToken: 'access', refreshToken: 'refresh' };
            mockAuthService.createTokens.mockReturnValue({
                sessionId: 'session-id',
                jti: 'jti',
                tokens: mockTokens,
            });

            (mockHelperService.dateCreate as jest.Mock).mockReturnValue(new Date());
            (mockHelperService.dateForward as jest.Mock).mockReturnValue(new Date());

            // Execute
            const result = await service.loginCrendential(loginDto, requestLog);

            // Verify
            expect(result).toEqual({ tokens: mockTokens });
            expect(userRepository.resetPasswordAttempt).toHaveBeenCalledWith(mockUser.id);
            expect(mockSessionService.create).toHaveBeenCalled();
            expect(userRepository.login).toHaveBeenCalledWith(mockUser.id, EnumUserLoginWith.CREDENTIAL);
        });

        it('Abnormal: should throw NotFoundException when user does not exist', async () => {
            // Setup mocks
            mockUserRepository.findUserWithUserNameOrEmail.mockResolvedValue(null);

            // Execute & Verify
            await expect(service.loginCrendential(loginDto, requestLog)).rejects.toThrow(NotFoundException);
            expect(userRepository.findUserWithUserNameOrEmail).toHaveBeenCalled();
        });

        it('Boundary: should throw ForbiddenException when password attempts exceed limit', async () => {
            // Setup mocks
            mockUserRepository.findUserWithUserNameOrEmail.mockResolvedValue(mockUser);
            mockAuthUtil.checkPasswordAttempt.mockReturnValue(true);

            // Execute & Verify
            await expect(service.loginCrendential(loginDto, requestLog)).rejects.toThrow(ForbiddenException);
            await expect(service.loginCrendential(loginDto, requestLog)).rejects.toThrow('Bạn đã nhập sai mật khẩu quá nhiều lần, vui lòng thử lại sau');

            expect(mockAuthUtil.checkPasswordAttempt).toHaveBeenCalledWith(mockUser);
            expect(mockAuthUtil.validatePassword).not.toHaveBeenCalled();
        });
    });

    describe('Worker Profile methods', () => {
        const userId = 1;
        const profileDto = {
            fullName: 'Worker Name',
            // ... other fields
        } as any;
        const mockProfile = { id: 1, userId, ...profileDto };

        describe('createWorkerProfile', () => {
            it('Normal: should create profile when it does not exist', async () => {
                mockUserRepository.getWorkerProfile.mockResolvedValue(null);
                mockUserRepository.createProfile.mockResolvedValue(mockProfile);

                const result = await service.createWorkerProfile(userId, profileDto);

                expect(result).toEqual(mockProfile);
                expect(userRepository.createProfile).toHaveBeenCalledWith(userId, profileDto);
            });

            it('Abnormal: should throw BadRequestException when profile already exists', async () => {
                mockUserRepository.getWorkerProfile.mockResolvedValue(mockProfile);

                await expect(service.createWorkerProfile(userId, profileDto)).rejects.toThrow(BadRequestException);
                await expect(service.createWorkerProfile(userId, profileDto)).rejects.toThrow('Hồ sơ của bạn đã tồn tại');
            });

            it('Boundary: should throw Error when repository.createProfile fails', async () => {
                mockUserRepository.getWorkerProfile.mockResolvedValue(null);
                mockUserRepository.createProfile.mockRejectedValue(new Error('DB Error'));

                await expect(service.createWorkerProfile(userId, profileDto)).rejects.toThrow('DB Error');
            });
        });

        describe('updateWorkerProfile', () => {
            it('Normal: should update profile when it exists', async () => {
                mockUserRepository.getWorkerProfile.mockResolvedValue(mockProfile);
                mockUserRepository.updateProfile.mockResolvedValue(mockProfile);

                const result = await service.updateWorkerProfile(userId, profileDto);

                expect(result).toEqual(mockProfile);
                expect(userRepository.updateProfile).toHaveBeenCalledWith(userId, profileDto);
            });

            it('Abnormal: should throw NotFoundException when profile does not exist', async () => {
                mockUserRepository.getWorkerProfile.mockResolvedValue(null);

                await expect(service.updateWorkerProfile(userId, profileDto)).rejects.toThrow(NotFoundException);
            });

            it('Boundary: should throw Error when repository.updateProfile fails', async () => {
                mockUserRepository.getWorkerProfile.mockResolvedValue(mockProfile);
                mockUserRepository.updateProfile.mockRejectedValue(new Error('DB Error'));

                await expect(service.updateWorkerProfile(userId, profileDto)).rejects.toThrow('DB Error');
            });
        });

        describe('getWorkerProfile', () => {
            it('Normal: should return profile when it exists', async () => {
                mockUserRepository.getWorkerProfile.mockResolvedValue(mockProfile);

                const result = await service.getWorkerProfile(userId);

                expect(result).toEqual(mockProfile);
            });

            it('Abnormal: should throw NotFoundException when profile does not exist', async () => {
                mockUserRepository.getWorkerProfile.mockResolvedValue(null);

                await expect(service.getWorkerProfile(userId)).rejects.toThrow(NotFoundException);
            });

            it('Boundary: should throw Error when repository.getWorkerProfile fails', async () => {
                mockUserRepository.getWorkerProfile.mockRejectedValue(new Error('DB Error'));
                await expect(service.getWorkerProfile(userId)).rejects.toThrow('DB Error');
            });
        });
    });

    describe('Authentication & Tokens', () => {
        const mockUser = { id: 1, email: 'test@example.com' } as any;
        const requestLog = { ipAddress: '127.0.0.1', userAgent: 'test-agent' };

        describe('refreshToken', () => {
            const refreshToken = 'valid-refresh-token';
            const payload = { userId: 1, sessionId: 's1', jti: 'old-jti' };

            it('Normal: should refresh tokens successfully', async () => {
                mockAuthUtil.payloadToken.mockReturnValue(payload);
                mockSessionService.getLogin.mockResolvedValue({ jti: 'old-jti' });
                mockAuthService.refreshTokens.mockReturnValue({ jti: 'new-jti', tokens: { accessToken: 'new-a' } });

                const result = await service.refreshToken(mockUser, refreshToken, requestLog);

                expect(result).toEqual({ accessToken: 'new-a' });
                expect(sessionService.updateLogin).toHaveBeenCalled();
                expect(userRepository.updateLastActivity).toHaveBeenCalledWith(mockUser.id);
            });

            it('Abnormal: should throw UnauthorizedException when session not found', async () => {
                mockAuthUtil.payloadToken.mockReturnValue(payload);
                mockSessionService.getLogin.mockResolvedValue(null);

                await expect(service.refreshToken(mockUser, refreshToken, requestLog)).rejects.toThrow(UnauthorizedException);
            });

            it('Boundary: should throw UnauthorizedException when jti mismatch', async () => {
                mockAuthUtil.payloadToken.mockReturnValue(payload);
                mockSessionService.getLogin.mockResolvedValue({ jti: 'mismatch-jti' });

                await expect(service.refreshToken(mockUser, refreshToken, requestLog)).rejects.toThrow(UnauthorizedException);
            });
        });

        describe('logout', () => {
            it('Normal: should call sessionService.revoke', async () => {
                await service.logout(1, 's1', requestLog);
                expect(sessionService.revoke).toHaveBeenCalledWith(1, 's1', requestLog);
            });

            it('Abnormal: should handle session already revoked or not found', async () => {
                mockSessionService.revoke.mockRejectedValue(new NotFoundException());
                await expect(service.logout(1, 's1', requestLog)).rejects.toThrow(NotFoundException);
            });

            it('Boundary: should throw Error when repository error occurs', async () => {
                mockSessionService.revoke.mockRejectedValue(new Error('Revoke Error'));
                await expect(service.logout(1, 's1', requestLog)).rejects.toThrow('Revoke Error');
            });
        });

        describe('loginWithSocial', () => {
            const email = 'social@example.com';
            const body = { fullName: 'Social User', role: EnumUserRole.WORKER };

            it('Normal: should login existing active social user', async () => {
                const existingUser = { id: 1, status: EnumUserStatus.ACTIVE } as any;
                mockUserRepository.findUserWithByEmail.mockResolvedValue(existingUser);
                mockAuthService.createTokens.mockReturnValue({ tokens: { accessToken: 'a' } });

                const result = await service.loginWithSocial(email, EnumUserLoginWith.SOCIAL_GOOGLE, body, requestLog);

                expect(result).toEqual({ tokens: { accessToken: 'a' } });
            });

            it('Normal: should create and login new social user', async () => {
                mockUserRepository.findUserWithByEmail.mockResolvedValue(null);
                const newUser = { id: 2, status: EnumUserStatus.ACTIVE } as any;
                mockUserRepository.createBySocial.mockResolvedValue(newUser);
                mockAuthService.createTokens.mockReturnValue({ tokens: { accessToken: 'a' } });

                await service.loginWithSocial(email, EnumUserLoginWith.SOCIAL_GOOGLE, body, requestLog);

                expect(userRepository.createBySocial).toHaveBeenCalled();
            });

            it('Abnormal: should throw ForbiddenException when user is inactive', async () => {
                const inactiveUser = { id: 1, status: EnumUserStatus.INACTIVE } as any;
                mockUserRepository.findUserWithByEmail.mockResolvedValue(inactiveUser);

                await expect(service.loginWithSocial(email, EnumUserLoginWith.SOCIAL_GOOGLE, body, requestLog)).rejects.toThrow(ForbiddenException);
            });

            it('Boundary: should throw Error when repository creation fails', async () => {
                mockUserRepository.findUserWithByEmail.mockResolvedValue(null);
                mockUserRepository.createBySocial.mockRejectedValue(new Error('Creation Failed'));

                await expect(service.loginWithSocial(email, EnumUserLoginWith.SOCIAL_GOOGLE, body, requestLog)).rejects.toThrow('Creation Failed');
            });
        });
    });

    describe('Password Management', () => {
        const email = 'test@example.com';
        const requestLog = { ipAddress: '127.0.0.1', userAgent: 'test-agent' };

        describe('forgotPassword', () => {
            it('Normal: should create token and send email successfully', async () => {
                const mockUser = { id: 1, email, fullName: 'Test' } as any;
                mockUserRepository.findUserWithByEmail.mockResolvedValue(mockUser);
                mockUserRepository.findLatestForgotPasswordRequest.mockResolvedValue(null);
                mockAuthUtil.createForgotPassword.mockReturnValue({ token: 't', expiredAt: new Date(), link: 'l' });

                await service.forgotPassword({ email }, requestLog);

                expect(userRepository.createForgotPasswordToken).toHaveBeenCalled();
                expect(mockEmailService.sendForgotPasswordEmail).toHaveBeenCalled();
            });

            it('Abnormal: should throw UnauthorizedException when email not found', async () => {
                mockUserRepository.findUserWithByEmail.mockResolvedValue(null);
                await expect(service.forgotPassword({ email }, requestLog)).rejects.toThrow(UnauthorizedException);
            });

            it('Boundary: should throw BadRequestException when rate limited', async () => {
                const mockUser = { id: 1, email } as any;
                mockUserRepository.findUserWithByEmail.mockResolvedValue(mockUser);
                mockUserRepository.findLatestForgotPasswordRequest.mockResolvedValue({ createdAt: new Date() });
                (mockHelperService.dateCreate as jest.Mock).mockReturnValue(new Date());
                (mockHelperService.dateForward as jest.Mock).mockReturnValue(new Date(Date.now() + 100000));

                await expect(service.forgotPassword({ email }, requestLog)).rejects.toThrow(BadRequestException);
            });
        });

        describe('resetPassword', () => {
            it('Normal: should update password and mark token used', async () => {
                const tokenRecord = { id: 1, userId: 1 };
                mockUserRepository.findValidForgotPasswordToken.mockResolvedValue(tokenRecord);
                mockAuthUtil.createPassword.mockReturnValue({ passwordHash: 'h' });

                await service.resetPassword({ token: 't', newPassword: 'p' }, requestLog);

                expect(userRepository.updatePassword).toHaveBeenCalled();
                expect(userRepository.markForgotPasswordTokenUsed).toHaveBeenCalledWith(tokenRecord.id);
            });

            it('Abnormal: should throw BadRequestException when token invalid', async () => {
                mockUserRepository.findValidForgotPasswordToken.mockResolvedValue(null);
                await expect(service.resetPassword({ token: 't', newPassword: 'p' }, requestLog)).rejects.toThrow(BadRequestException);
            });

            it('Boundary: should throw Error when database update fails', async () => {
                const tokenRecord = { id: 1, userId: 1 };
                mockUserRepository.findValidForgotPasswordToken.mockResolvedValue(tokenRecord);
                mockUserRepository.updatePassword.mockRejectedValue(new Error('Update Failed'));

                await expect(service.resetPassword({ token: 't', newPassword: 'p' }, requestLog)).rejects.toThrow('Update Failed');
            });
        });
    });

    describe('User Info methods', () => {
        describe('getUserById', () => {
            it('Normal: should return user when exists', async () => {
                const mockUser = { id: 1 };
                mockUserRepository.findOneById.mockResolvedValue(mockUser);
                const result = await service.getUserById(1);
                expect(result).toEqual(mockUser);
            });

            it('Abnormal: should throw NotFoundException when user not found', async () => {
                mockUserRepository.findOneById.mockResolvedValue(null);
                await expect(service.getUserById(1)).rejects.toThrow(NotFoundException);
            });

            it('Boundary: should throw Error when repository fails', async () => {
                mockUserRepository.findOneById.mockRejectedValue(new Error('Repo Error'));
                await expect(service.getUserById(1)).rejects.toThrow('Repo Error');
            });
        });

        describe('updateInfoUser', () => {
            it('Normal: should call repository updateInfoUser', async () => {
                const dto = { fullName: 'New' } as any;
                mockUserRepository.findOneById.mockResolvedValue({ id: 1 });
                await service.updateInfoUser(1, dto);
                expect(userRepository.updateInfoUser).toHaveBeenCalledWith(1, dto);
            });

            it('Abnormal: should throw NotFoundException when user not found', async () => {
                mockUserRepository.findOneById.mockResolvedValue(null);
                await expect(service.updateInfoUser(1, { fullName: 'New' } as any)).rejects.toThrow(NotFoundException);
            });

            it('Boundary: should handle repository error', async () => {
                mockUserRepository.findOneById.mockResolvedValue({ id: 1 });
                mockUserRepository.updateInfoUser.mockRejectedValue(new Error('DB Error'));
                await expect(service.updateInfoUser(1, { fullName: 'New' } as any)).rejects.toThrow('DB Error');
            });
        });
    });
});
