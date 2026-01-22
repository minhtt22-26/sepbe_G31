import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { PrismaService } from 'src/prisma.service'
import { Role } from 'src/shared/utils/enum'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private idCounter = 1

  getAllUsers() {
    return this.prismaService.user.findMany()
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10)

    try {
      return await this.prismaService.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: Role.USER,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      })
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email hoặc số điện thoại đã tồn tại')
      }
      throw error
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto

    const user = await this.prismaService.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    const payload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = await this.jwtService.signAsync(payload)

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }

  async getProfile(userId: number) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại')
    }

    return user
  }
}
