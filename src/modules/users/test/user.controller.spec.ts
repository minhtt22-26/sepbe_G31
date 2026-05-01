import { Test, TestingModule } from '@nestjs/testing'
import { UserController } from '../controller/user.controller'
import { UserService } from '../service/user.service'
import { UserSignUpRequestDto } from '../dtos/request/user.sign-up.request.dto'
import { UserLoginRequestDto } from '../dtos/request/user.login.request.dto'
import { EnumUserLoginWith, EnumUserRole } from 'src/generated/prisma/enums'
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { AuthService } from 'src/modules/auth/service/auth.service'
import { AuthUtil } from 'src/modules/auth/utils/auth.utils'
import { HelperService } from 'src/common/helper/service/helper.service'

describe('UserController', () => {
  let controller: UserController
  let userService: UserService

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
    changePassword: jest.fn(),
    userDeleteAccount: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: {} },
        { provide: AuthUtil, useValue: {} },
        { provide: HelperService, useValue: {} },
      ],
    }).compile()

    controller = module.get<UserController>(UserController)
    userService = module.get<UserService>(UserService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('signUp', () => {
    const signUpDto: UserSignUpRequestDto = {
      fullName: 'Test User',
      userName: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: EnumUserRole.WORKER,
    }

    it('Normal: should call userService.signUp successfully', async () => {
      mockUserService.signUp.mockResolvedValue(undefined)
      await controller.signUp(signUpDto)
      expect(userService.signUp).toHaveBeenCalledWith(signUpDto)
    })

    it('Abnormal: should propagate error from userService.signUp', async () => {
      mockUserService.signUp.mockRejectedValue(new BadRequestException('Error'))
      await expect(controller.signUp(signUpDto)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('Boundary: should handle minimal data', async () => {
      mockUserService.signUp.mockResolvedValue(undefined)
      const minimalDto: any = { fullName: 'Min', role: EnumUserRole.WORKER }
      await controller.signUp(minimalDto)
      expect(userService.signUp).toHaveBeenCalledWith(minimalDto)
    })
  })

  describe('loginWithCredential', () => {
    const loginDto: UserLoginRequestDto = { email: 't@e.com', password: 'p' }
    // const  = {
    //   ip: '1.1.1.1',
    //   headers: { 'user-agent': 'agent' },
    // } as any

    it('Normal: should login successfully', async () => {
      mockUserService.loginCrendential.mockResolvedValue({ tokens: {} })
      await controller.loginWithCredential(loginDto)
      expect(userService.loginCrendential).toHaveBeenCalledWith(loginDto)
    })

    it('Abnormal: should handle unauthorized login', async () => {
      mockUserService.loginCrendential.mockRejectedValue(
        new UnauthorizedException(),
      )
      await expect(controller.loginWithCredential(loginDto)).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('Boundary: should handle missing headers/IP', async () => {
      mockUserService.loginCrendential.mockResolvedValue({ tokens: {} })
      await controller.loginWithCredential(loginDto)
      expect(userService.loginCrendential).toHaveBeenCalledWith(loginDto)
    })
  })

  describe('refreshToken', () => {
    const user = { userId: 1 } as any
    // const  = { ip: '1.1.1.1', headers: {} } as any

    it('Normal: should refresh tokens', async () => {
      mockUserService.getUserById.mockResolvedValue({ id: 1 })
      mockUserService.refreshToken.mockResolvedValue({ accessToken: 'a' })
      const result = await controller.refreshToken(user, 'old')
      expect(result).toEqual({ accessToken: 'a' })
    })

    it('Abnormal: should handle user not found', async () => {
      mockUserService.getUserById.mockResolvedValue(null)
      await controller.refreshToken(user, 'old')
      expect(userService.refreshToken).toHaveBeenCalledWith(null, 'old')
    })
  })

  describe('Password Management', () => {
    // const  = { ip: '1.1.1.1', headers: {} } as any

    it('forgotPassword: should delegate to service', async () => {
      await controller.forgotPassword({ email: 'e' })
      expect(userService.forgotPassword).toHaveBeenCalled()
    })

    it('resetPassword: should delegate to service', async () => {
      await controller.resetPassword({ token: 't', newPassword: 'p' })
      expect(userService.resetPassword).toHaveBeenCalled()
    })

    it('changePassword: Normal: should delegate to service', async () => {
      await controller.changePassword(1, {
        oldPassword: 'old',
        newPassword: 'new',
      })
      expect(userService.changePassword).toHaveBeenCalled()
    })

    it('changePassword: Abnormal: should handle service errors', async () => {
      mockUserService.changePassword.mockRejectedValue(new BadRequestException('Error'))
      await expect(
        controller.changePassword(1, { oldPassword: 'o', newPassword: 'n' }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('Profile & Info', () => {
    it('createWorkerProfile: should call service', async () => {
      await controller.createWorkerProfile(1, {})
      expect(userService.createWorkerProfile).toHaveBeenCalledWith(1, {})
    })

    it('getWorkerProfile: should call service', async () => {
      await controller.getWorkerProfile(1)
      expect(userService.getWorkerProfile).toHaveBeenCalledWith(1)
    })

    it('updateInfoUser: should call service', async () => {
      await controller.updateInfoUser(1, {})
      expect(userService.updateInfoUser).toHaveBeenCalledWith(1, {}, undefined)
    })
  })

  describe('Auth Social & Session', () => {
    it('logout: should call session service revoke', async () => {
      await controller.logout(
        1,
        's',
        //  { headers: {} } as any
      )
      expect(userService.logout).toHaveBeenCalled()
    })

    it('loginWithGoogle: should call service', async () => {
      mockUserService.loginWithSocial.mockResolvedValue({ tokens: {} })
      await controller.loginWithGoogle(
        {
          email: 'e',
          emailVerified: true,
          fullName: 'Google User Name',
        },
        {},
      )
      expect(userService.loginWithSocial).toHaveBeenCalledWith(
        'e',
        EnumUserLoginWith.SOCIAL_GOOGLE,
        {},
        { googleFullName: 'Google User Name' },
      )
    })

    it('userDeleteAccount: Normal: should call service', async () => {
      await controller.userDeleteAccount(1)
      expect(userService.userDeleteAccount).toHaveBeenCalledWith(1)
    })

    it('userDeleteAccount: Abnormal: should handle service errors', async () => {
      mockUserService.userDeleteAccount.mockRejectedValue(new BadRequestException('Error'))
      await expect(controller.userDeleteAccount(1)).rejects.toThrow(BadRequestException)
    })
  })
})
