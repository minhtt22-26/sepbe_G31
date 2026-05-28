import 'reflect-metadata'
import { AuthTokenResponseDto } from './auth.response.token.dto'

describe('AuthTokenResponseDto', () => {
  it('can be instantiated with all properties', () => {
    const dto = new AuthTokenResponseDto()
    dto.tokenType = 'Bearer'
    dto.expiredIn = 3600
    dto.accessToken = 'access.jwt.token'
    dto.refreshToken = 'refresh.jwt.token'
    dto.roleType = 'EMPLOYER'
    expect(dto.tokenType).toBe('Bearer')
    expect(dto.expiredIn).toBe(3600)
    expect(dto.roleType).toBe('EMPLOYER')
  })

  it('allows optional roleType to be undefined', () => {
    const dto = new AuthTokenResponseDto()
    dto.tokenType = 'Bearer'
    dto.expiredIn = 900
    dto.accessToken = 'token'
    dto.refreshToken = 'refresh'
    expect(dto.roleType).toBeUndefined()
  })
})
