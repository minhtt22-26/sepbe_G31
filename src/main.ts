import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { Logger, ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  })

  app.useGlobalFilters(new HttpExceptionFilter())

  app.useGlobalInterceptors(new ResponseInterceptor())

  const config = app.get(ConfigService)

  const port = config.get<number>('app.port', 4000)

  const apiPrefix = config.get<string>('app.apiPrefix', 'api')

  app.setGlobalPrefix(apiPrefix)

  app.enableShutdownHooks()

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  const corsOrigin = config.get<string>('CORS_ORIGIN')

  app.enableCors({
    origin: corsOrigin?.includes(',') ? corsOrigin.split(',') : corsOrigin,
    credentials: true,
  })
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SEP Backend API')
    .setDescription('API documentation for SEP Backend API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    ignoreGlobalPrefix: false,
  })
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document)
  Logger.log(`🚀 API: http://localhost:${port}/${apiPrefix}`)
  Logger.log(`📘 Swagger: http://localhost:${port}/${apiPrefix}/docs`)
  await app.listen(port)
}
bootstrap()
