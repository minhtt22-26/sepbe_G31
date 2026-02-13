import { plainToInstance } from 'class-transformer'
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator'

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv

  @IsNumber()
  APP_PORT: number

  @IsString()
  APP_API_PREFIX: string

  @IsOptional()
  @IsString()
  DATABASE_URL?: string

  @IsOptional()
  @IsString()
  JWT_SECRET?: string
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  })

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n'),
    )
  }

  return validatedConfig
}
