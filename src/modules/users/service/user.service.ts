import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { UserRepository } from '../repositories/user.repository'
import { UserSignUpRequestDto } from '../dtos/request/user.sign-up.request.dto'
import { AuthUtil } from 'src/modules/auth/utils/auth.utils'
import { UserLoginRequestDto } from '../dtos/request/user.login.request.dto'
import { UserLoginResponseDto } from '../dtos/response/user.login.response.dto'
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

@Injectable()
export class UserService {
  constructor(
    private readonly authUtil: AuthUtil,
    private readonly authService: AuthService,
    private readonly helperService: HelperService,
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
  ) { }

  async signUp({
    userName,
    email,
    password: passwordString,
    ...others
  }: UserSignUpRequestDto) {
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
    requestLog: { ipAddress: string; userAgent: string },
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

    if (this.authUtil.checkPasswordExpired(user.passwordExpired)) {
      throw new ForbiddenException({
        message: 'Mật khẩu của bạn đã hết hạn, vui lòng đổi mật khẩu mới',
      })
    }

    return this.handleLogin(user, EnumUserLoginWith.CREDENTIAL, requestLog)
  }

  private async handleLogin(
    user: User,
    loginWith: EnumUserLoginWith,
    requestLog: {
      ipAddress: string
      userAgent: string
    },
  ): Promise<UserLoginResponseDto> {
    const tokens = await this.createTokenAndSession(user, loginWith, requestLog)

    return { tokens }
  }

  private async createTokenAndSession(
    user: User,
    loginWith: EnumUserLoginWith,
    requestLog: {
      ipAddress: string
      userAgent: string
    },
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
        ipAddress: requestLog.ipAddress,
        userAgent: requestLog.userAgent,
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
    return this.userRepository.createProfile(userId, dto)
  }

  async updateWorkerProfile(
    userId: number,
    dto: WorkerProfileRequestDto,
  ): Promise<WorkerProfile> {
    const existing = await this.userRepository.getWorkerProfile(userId)
    if (!existing) {
      throw new NotFoundException({
        message: 'Không tìm thấy hồ sơ của bạn, vui lòng tạo hồ sơ trước',
      })
    }
    return this.userRepository.updateProfile(userId, dto)
  }

  async updateInfoUser(
    userId: number,
    dto: UserInfoRequestDto,
  ): Promise<User> {
    return this.userRepository.updateInfoUser(userId, dto)
  }

  async getWorkerProfile(userId: number): Promise<WorkerProfile> {
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
    requestLog: {
      ipAddress: string
      userAgent: string
    },
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
        ipAddress: requestLog.ipAddress,
        userAgent: requestLog.userAgent,
      } as ISessionCreate),
      this.userRepository.updateLastActivity(user.id),
    ])

    return tokens
  }

  async forgotPassword(
    { email }: ForgotPasswordRequestDto,
    requestLog: {
      ipAddress: string
      userAgent: string
    },
  ): Promise<void> {
    console.log(requestLog)
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
    requestLog: { ipAddress: string; userAgent: string },
  ): Promise<void> {
    console.log(requestLog)
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
      password.passwordExpired,
      password.passwordCreated,
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
    requestLog: { ipAddress: string; userAgent: string },
  ): Promise<UserLoginResponseDto> {
    let user = await this.userRepository.findUserWithByEmail(email)

    // Nếu user không tồn tại, tạo mới
    if (!user) {
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

    return this.handleLogin(user, loginWith, requestLog)
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
    requestLog: { ipAddress: string; userAgent: string },
  ): Promise<void> {
    await this.sessionService.revoke(userId, sessionId, requestLog)
  }
}
