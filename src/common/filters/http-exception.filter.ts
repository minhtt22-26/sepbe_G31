import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch() // 👈 Bắt tất cả exception
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: any = 'Internal server error'
    let apiCode: string | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()

      if (typeof res === 'string') {
        message = res
      } else {
        const obj = res as Record<string, unknown>
        message = obj.message ?? 'Error'
        if (typeof obj.code === 'string') {
          apiCode = obj.code
        }
      }

      // 🔥 Log lỗi tại đây
      this.logger.error(
        `${request.method} ${request.url}`,
        (exception as any)?.stack,
      )

      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        message,
        ...(apiCode !== undefined ? { code: apiCode } : {}),
      })
      return
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      (exception as any)?.stack,
    )

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    })
  }
}
