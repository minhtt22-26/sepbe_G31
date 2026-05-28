import 'reflect-metadata'
import { UserLoginResponseDto } from './user.login.response.dto'
import { AuthTokenResponseDto } from 'src/modules/auth/dto/response/auth.response.token.dto'

describe('UserLoginResponseDto', () => {
  it('can be instantiated with tokens', () => {
    const dto = new UserLoginResponseDto()
    const tokens = new AuthTokenResponseDto()
    tokens.tokenType = 'Bearer'
    tokens.expiredIn = 3600
    tokens.accessToken = 'access.token'
    tokens.refreshToken = 'refresh.token'
    dto.tokens = tokens
    expect(dto.tokens.tokenType).toBe('Bearer')
    expect(dto.tokens.accessToken).toBe('access.token')
  })
})
