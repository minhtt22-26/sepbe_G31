import { HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common'
import { HttpExceptionFilter } from './http-exception.filter'

function buildHost(responseMock: any, requestMock: any) {
  return {
    switchToHttp: () => ({
      getResponse: () => responseMock,
      getRequest: () => requestMock,
    }),
  } as any
}

function buildRequest(method = 'GET', url = '/test') {
  return { method, url }
}

function buildResponse() {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  return { status, json, _json: json }
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter

  beforeEach(() => {
    filter = new HttpExceptionFilter()
    jest.spyOn((filter as any).logger, 'error').mockImplementation(() => {})
  })

  it('handles HttpException with string response', () => {
    const res = buildResponse()
    const req = buildRequest()
    filter.catch(new HttpException('Bad input', HttpStatus.BAD_REQUEST), buildHost(res, req))

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    const body = res.status.mock.results[0].value.json.mock.calls[0][0]
    expect(body.message).toBe('Bad input')
    expect(body.statusCode).toBe(400)
    expect(body.path).toBe('/test')
  })

  it('handles HttpException with object response', () => {
    const res = buildResponse()
    filter.catch(new BadRequestException({ message: 'Field required', code: 'FIELD_MISSING' }), buildHost(res, buildRequest()))

    const body = res.status.mock.results[0].value.json.mock.calls[0][0]
    expect(body.message).toBe('Field required')
    expect(body.code).toBe('FIELD_MISSING')
  })

  it('handles HttpException with object response missing code', () => {
    const res = buildResponse()
    filter.catch(new NotFoundException('User not found'), buildHost(res, buildRequest()))

    const body = res.status.mock.results[0].value.json.mock.calls[0][0]
    expect(body.statusCode).toBe(404)
    expect(body).not.toHaveProperty('code')
  })

  it('handles non-HttpException as 500', () => {
    const res = buildResponse()
    filter.catch(new Error('Something crashed'), buildHost(res, buildRequest('POST', '/api/data')))

    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    const body = res.status.mock.results[0].value.json.mock.calls[0][0]
    expect(body.message).toBe('Internal server error')
    expect(body.path).toBe('/api/data')
  })

  it('includes timestamp in response', () => {
    const res = buildResponse()
    filter.catch(new BadRequestException('error'), buildHost(res, buildRequest()))
    const body = res.status.mock.results[0].value.json.mock.calls[0][0]
    expect(typeof body.timestamp).toBe('string')
  })
})
