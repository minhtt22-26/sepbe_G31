import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
export interface FakeUser {
  id: number
  email: string
  password: string
  role: 'USER' | 'ADMIN'
}

@Injectable()
export class AuthService {
  // fake database
  private users: FakeUser[] = [
    {
      id: 1,
      email: 'test@gmail.com',
      password: 'password123',
      role: 'ADMIN',
    },
  ]
  private idCounter = 1

  getAllUsers() {
    return this.users
  }

  register(dto: RegisterDto) {
    const existedUser = this.users.find((user) => user.email === dto.email)

    if (existedUser) {
      throw new BadRequestException('Email already exists')
    }

    const newUser: FakeUser = {
      id: this.idCounter++,
      email: dto.email,
      password: dto.password,
      role: 'USER',
    }

    this.users.push(newUser)

    // không trả password
    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    }
  }

  /**
   * Login fake user
   */
  login(dto: LoginDto) {
    const user = this.users.find((u) => u.email === dto.email)

    if (!user || user.password !== dto.password) {
      throw new UnauthorizedException('Invalid email or password')
    }

    // fake token
    return {
      accessToken: 'fake-jwt-token',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }
  }

  /**
   * Get profile (mock)
   */
  getProfile(userId: number) {
    const user = this.users.find((u) => u.id === userId)

    if (!user) {
      throw new UnauthorizedException()
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    }
  }
}
