import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { UserRepository } from '../repositories/user.repository'
import { UserSignUpRequestDto } from '../dtos/request/user.sign-up.request.dto'
import { AuthUtil } from 'src/modules/auth/utils/auth.utils'
import { UserLoginRequestDto } from '../dtos/request/user.login.request.dto'
import { UserLoginResponseDto } from '../dtos/response/user.login.response.dto'
import { UserListRequestDto } from '../dtos/request/user.list.request.dto'
import {
  EnumUserLoginWith,
  EnumUserRole,
  EnumUserStatus,
} from 'src/generated/prisma/enums'
import { User, WorkerProfile } from 'src/generated/prisma/client'
import { AuthTokenResponseDto } from 'src/modules/auth/dto/response/auth.response.token.dto'
import { AuthService } from 'src/modules/auth/service/auth.service'
import { HelperService } from 'src/common/helper/service/helper.service'
import { SessionService } from 'src/modules/session/service/session.service'
import { WorkerProfileRequestDto } from '../dtos/request/user.profile.request.dto'
import { IAuthRefreshTokenPayload } from 'src/modules/auth/interfaces/auth.interface'
import { ISessionCreate } from 'src/modules/session/interfaces/session.interface'
import { ForgotPasswordRequestDto } from 'src/modules/auth/dto/request/forgot-password.request.dto'
import { ResetPasswordRequestDto } from 'src/modules/auth/dto/request/reset-password.request.dto'
import { EmailService } from 'src/infrastructure/email/service/email.service'
import { UserInfoRequestDto } from '../dtos/request/user.info.request.dto'
import { UserChangePasswordRequestDto } from '../dtos/request/user.change-passwrod.dto'
import { CloudinaryService } from 'src/infrastructure/cloudinary/cloudinary.service'
import { WorkerProfileWithOccupation } from '../interfaces/worker-profile.interface'
import { Logger } from '@nestjs/common'
import { AIMatchingService } from 'src/modules/ai-matching/service/ai-matching.service'

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)

  constructor(
    private readonly authUtil: AuthUtil,
    private readonly authService: AuthService,
    private readonly helperService: HelperService,
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly cloudinaryService: CloudinaryService,
    // private readonly embeddingQueueService: EmbeddingQueueService,
    @Inject(forwardRef(() => AIMatchingService))
    private readonly aiMatchingService: AIMatchingService,
  ) { }

  private async validateSingleManagerConstraint(role: EnumUserRole) {
    if (role !== EnumUserRole.MANAGER) return

    const managerCount = await this.userRepository.countNonDeletedManagers()
    if (managerCount > 0) {
      throw new BadRequestException({
        message: 'Hệ thống chỉ cho phép duy nhất 1 tài khoản manager',
      })
    }
  }

  async signUp({
    userName,
    email,
    password: passwordString,
    ...others
  }: UserSignUpRequestDto) {
    await this.validateSingleManagerConstraint(others.role)

    const isExistEmail = email
      ? await this.userRepository.findUserWithByEmail(email)
      : null
    if (isExistEmail) {
      throw new BadRequestException({
        message: 'Email này đã được sử dụng rồi',
      })
    }

    const isExistName = userName
      ? await this.userRepository.findUserWithByUserName(userName)
      : null
    if (isExistName) {
      throw new BadRequestException({
        message: 'Tên đăng nhập này đã có người dùng',
      })
    }

    const password = this.authUtil.createPassword(passwordString)

    await this.userRepository.signUp(
      {
        userName,
        email,
        password: passwordString,
        ...others,
      },
      password,
    )
  }

  async loginCrendential(
    { email, userName, password }: UserLoginRequestDto,
    //requestLog: { ipAddress: string; userAgent: string},
  ): Promise<UserLoginResponseDto> {
    const user = await this.userRepository.findUserWithUserNameOrEmail({
      email,
      userName,
    })
    if (!user) {
      throw new NotFoundException({
        message: 'Không tìm thấy thông tin người dùng',
      })
    }

    if (user.status !== EnumUserStatus.ACTIVE) {
      throw new ForbiddenException({
        message: 'Tài khoản của bạn hiện đang bị khóa hoặc chưa kích hoạt',
      })
    }

    if (!user.password) {
      throw new ForbiddenException({
        message: 'Tài khoản này chưa thiết lập mật khẩu',
      })
    }

    if (this.authUtil.checkPasswordAttempt(user)) {
      throw new ForbiddenException({
        message: 'Bạn đã nhập sai mật khẩu quá nhiều lần, vui lòng thử lại sau',
      })
    }

    if (!this.authUtil.validatePassword(password, user.password)) {
      await this.userRepository.increasePasswordAttempt(user.id)
      throw new ForbiddenException({
        message: 'Mật khẩu không đúng, vui lòng kiểm tra lại',
      })
    }

    await this.userRepository.resetPasswordAttempt(user.id)

    // if (this.authUtil.checkPasswordExpired(user.passwordExpired)) {
    //   throw new ForbiddenException({
    //     message: 'Mật khẩu của bạn đã hết hạn, vui lòng đổi mật khẩu mới',
    //   })
    // }

    return this.handleLogin(user, EnumUserLoginWith.CREDENTIAL)
  }

  private async handleLogin(
    user: User,
    loginWith: EnumUserLoginWith,
    // requestLog: {
    //   ipAddress: string
    //   userAgent: string
    // },
  ): Promise<UserLoginResponseDto> {
    const tokens = await this.createTokenAndSession(user, loginWith)

    return { tokens }
  }

  private async createTokenAndSession(
    user: User,
    loginWith: EnumUserLoginWith,
    // requestLog: {
    //   ipAddress: string
    //   userAgent: string
    // },
  ): Promise<AuthTokenResponseDto> {
    const { sessionId, jti, tokens } = this.authService.createTokens(
      user,
      loginWith,
    )

    const expiredAt = this.helperService.dateForward(
      this.helperService.dateCreate(), //Today
      { seconds: this.authUtil.jwtRefreshTokenExpirationTimeInSeconds },
    )

    await Promise.all([
      this.sessionService.create({
        id: sessionId,
        userId: user.id,
        jti,
        // ipAddress: requestLog.ipAddress,
        // userAgent: requestLog.userAgent,
        expiredAt,
      }),
      this.userRepository.login(user.id, loginWith),
    ])

    return tokens
  }

  async createWorkerProfile(
    userId: number,
    dto: WorkerProfileRequestDto,
  ): Promise<WorkerProfile> {
    const existing = await this.userRepository.getWorkerProfile(userId)
    if (existing) {
      throw new BadRequestException({
        message: 'Hồ sơ của bạn đã tồn tại, vui lòng cập nhật thay vì tạo mới',
      })
    }
    const profile = await this.userRepository.createProfile(userId, dto)

    //this.embeddingQueueService.queueWorkerProfileEmbedding(userId)
    // Gọi trực tiếp embedding (không qua queue)
    await this.aiMatchingService.buildWorkerProfileEmbedding(userId)

    return profile
  }

  async updateWorkerProfile(
    userId: number,
    dto: WorkerProfileRequestDto,
  ): Promise<WorkerProfile> {
    // const existing = await this.userRepository.getWorkerProfile(userId)
    // if (!existing) {
    //   throw new NotFoundException({
    //     message: 'Không tìm thấy hồ sơ người lao động',
    //   })
    // }

    const profile = await this.userRepository.updateProfile(userId, dto)

    //await this.embeddingQueueService.queueWorkerProfileEmbedding(userId)
    // .catch((err) =>
    //   console.error('Failed to queue embedding worker profile', err),
    // )
    // Gọi trực tiếp embedding (không qua queue)
    await this.aiMatchingService.buildWorkerProfileEmbedding(userId)

    return profile
  }

  async updateInfoUser(
    userId: number,
    dto: UserInfoRequestDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    const user = await this.getUserById(userId)

    if (!user) {
      throw new NotFoundException({
        message: 'Không tìm thấy thông tin của bạn',
      })
    }

    let avatarUrl = dto.avatar
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        file,
        'user_avatars',
      )
      avatarUrl = (uploadResult as any).secure_url
    }

    if (typeof dto.avatar !== 'string') {
      delete dto.avatar
    }

    const { ...updateData } = dto

    return await this.userRepository.updateInfoUser(userId, {
      ...updateData,
      ...(avatarUrl && { avatar: avatarUrl }),
    })
  }

  async getWorkerProfile(userId: number): Promise<WorkerProfileWithOccupation> {
    const profile = await this.userRepository.getWorkerProfile(userId)
    if (!profile) {
      throw new NotFoundException({
        message: 'Không tìm thấy hồ sơ của người dùng này',
      })
    }
    return profile
  }

  async refreshToken(
    user: User,
    refreshToken: string,
    // requestLog: {
    //   ipAddress: string
    //   userAgent: string
    // },
  ): Promise<AuthTokenResponseDto> {
    const {
      sessionId,
      userId,
      jti: oldJti,
      //loginWith,
    } = this.authUtil.payloadToken<IAuthRefreshTokenPayload>(refreshToken)

    // Validate session exists and jti matches
    const session = await this.sessionService.getLogin(userId, sessionId)
    if (!session) {
      throw new UnauthorizedException({
        message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
      })
    }

    if (session.jti !== oldJti) {
      throw new UnauthorizedException({
        message: 'Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại',
      })
    }

    // Generate new tokens
    const {
      jti: newJti,
      tokens,
      //expiredInMs,
    } = this.authService.refreshTokens(user, refreshToken)

    // Update session with new jti, ipAddress, userAgent in database
    await Promise.all([
      this.sessionService.updateLogin({
        userId,
        id: sessionId,
        jti: newJti,
        // ipAddress: requestLog.ipAddress,
        // userAgent: requestLog.userAgent,
      } as ISessionCreate),
      this.userRepository.updateLastActivity(user.id),
    ])

    return tokens
  }

  async forgotPassword(
    { email }: ForgotPasswordRequestDto,
    // requestLog: {
    //   ipAddress: string
    //   userAgent: string
    // },
  ): Promise<void> {
    const user = await this.userRepository.findUserWithByEmail(email)

    if (!user) {
      throw new UnauthorizedException({
        message: 'Email này chưa được đăng ký trong hệ thống',
      })
    }

    const lastRequest =
      await this.userRepository.findLatestForgotPasswordRequest(user.id)
    if (lastRequest) {
      const now = this.helperService.dateCreate()
      const canResendAt = this.helperService.dateForward(
        lastRequest.createdAt,
        this.helperService.dateCreateDuration({
          seconds: this.authUtil.forgotPasswordResendMinutes,
        }),
      )

      if (now < canResendAt) {
        throw new BadRequestException({
          message: 'Bạn vừa yêu cầu gửi email rồi, vui lòng đợi một chút nhé',
        })
      }
    }

    const forgotPassword = this.authUtil.createForgotPassword()

    await this.userRepository.createForgotPasswordToken(
      user.id,
      forgotPassword.token,
      forgotPassword.expiredAt,
    )

    // TODO: Gửi email chứa link reset password
    await this.emailService.sendForgotPasswordEmail(
      user.email!,
      forgotPassword.link,
      user.fullName,
    )
  }

  async resetPassword(
    { token, newPassword }: ResetPasswordRequestDto,
    // requestLog: { ipAddress: string; userAgent: string },
  ): Promise<void> {
    const tokenRecord =
      await this.userRepository.findValidForgotPasswordToken(token)

    if (!tokenRecord) {
      throw new BadRequestException({
        message: 'Đường dẫn khôi phục mật khẩu không hợp lệ hoặc đã hết hạn',
      })
    }

    // Hash password mới
    const password = this.authUtil.createPassword(newPassword)

    // Update password
    await this.userRepository.updatePassword(
      tokenRecord.userId,
      password.passwordHash,
      //password.passwordExpired,
      //password.passwordCreated,
    )

    // Mark token là đã sử dụng
    await this.userRepository.markForgotPasswordTokenUsed(tokenRecord.id)

    // Revoke tất cả sessions (logout tất cả devices)
    // await this.sessionService.revokeAllByUser(tokenRecord.userId);
  }

  async loginWithSocial(
    email: string,
    loginWith: EnumUserLoginWith,
    body: {
      fullName?: string
      role: EnumUserRole
    },
    // requestLog: { ipAddress: string; userAgent: string },
  ): Promise<UserLoginResponseDto> {
    let user = await this.userRepository.findUserWithByEmail(email)

    // Nếu user không tồn tại, tạo mới
    if (!user) {
      await this.validateSingleManagerConstraint(body.role)

      user = await this.userRepository.createBySocial(
        email,
        body.fullName,
        loginWith,
        this.helperService.dateCreate(),
        body.role,
      )
    }

    if (user.status !== EnumUserStatus.ACTIVE) {
      throw new ForbiddenException({
        message: 'Tài khoản của bạn hiện đang bị khóa hoặc chưa kích hoạt',
      })
    }

    return this.handleLogin(user, loginWith)
  }

  async getUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findOneById(userId)

    if (!user) {
      throw new NotFoundException({
        message: 'Không tìm thấy người dùng này',
      })
    }
    return user
  }

  async logout(
    userId: number,
    sessionId: string,
    //requestLog: { ipAddress: string; userAgent: string },
  ): Promise<void> {
    await this.sessionService.revoke(userId, sessionId)
  }

  async changePassword(
    userId: number,
    dto: UserChangePasswordRequestDto,
  ): Promise<void> {
    const user = await this.userRepository.findOneById(userId)

    if (!user) {
      throw new NotFoundException({
        message: 'Không tìm thấy người dùng này',
      })
    }

    if (user.password) {
      if (!dto.oldPassword) {
        throw new BadRequestException({
          message: 'Vui lòng cung cấp mật khẩu hiện tại',
        })
      }

      const isValidPassword = this.authUtil.validatePassword(
        dto.oldPassword,
        user.password,
      )

      if (!isValidPassword) {
        throw new BadRequestException({
          message: 'Mật khẩu hiện tại không chính xác',
        })
      }
    }

    const password = this.authUtil.createPassword(dto.newPassword)

    await this.userRepository.updatePassword(
      userId,
      password.passwordHash,
      //password.passwordExpired,
      //password.passwordCreated,
    )
  }

  async userDeleteAccount(userId: number): Promise<User> {
    const user = await this.userRepository.findOneById(userId)

    if (!user) {
      throw new NotFoundException({
        message: 'Không tìm thấy người dùng này',
      })
    }

    if (user.status != EnumUserStatus.ACTIVE) {
      throw new BadRequestException({
        message: 'Tài khoản của bạn không hoạt động',
      })
    }

    await this.sessionService.revokeAll(userId)

    const userUpdate = await this.userRepository.userDelete(
      userId,
      user.email,
      user.userName,
    )

    return userUpdate
  }

  async getUserList(filters: UserListRequestDto) {
    const result = await this.userRepository.getUserList(filters)

    const data = result.users.map((user) => ({
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      createdDate: user.createdAt.toISOString(),
    }))

    return {
      data,
      page: result.page,
      size: result.size,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    }
  }
  async updateUserStatus(userId: number, status: EnumUserStatus): Promise<User> {
    const user = await this.userRepository.findOneById(userId)

    if (!user) {
      throw new NotFoundException({
        message: 'Không tìm thấy người dùng này', // User not found
      })
    }

    if (status !== EnumUserStatus.ACTIVE && status !== EnumUserStatus.DELETED) {
      throw new BadRequestException({
        message: 'Trạng thái không hợp lệ', // Invalid status value
      })
    }

    if (user.status === status) {
      return user
    }

    return this.userRepository.updateUserStatus(userId, status)
  }
}
