import {
  Injectable,
} from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'


@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async testConnection() {
    try {
      // Test database connection by counting users
      const userCount = await this.prisma.user.count()
      return {
        success: true,
        message: 'Database connection successful!',
        userCount,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        message: 'Database connection failed',
        error: error.message,
      }
    }
  }

  async createTestSession() {
    try {
      // 1. Create a test user
      const user = await this.prisma.user.create({
        data: {
          fullName: 'Test User',
          email: `test${Date.now()}@example.com`,
          role: 'WORKER',
          status: 'ACTIVE',
          password: 'hashed_password_placeholder', // In production, this should be bcrypt hashed
          isVerified: true,
        },
      })

      // 2. Create a session for this user
      const session = await this.prisma.session.create({
        data: {
          userId: user.id,
          jti: `jti_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
        },
      })

      return {
        success: true,
        message: 'Test user and session created successfully!',
        data: session,
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create session',
        error: error.message,
      }
    }
  }
}
