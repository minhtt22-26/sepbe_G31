import { ResponseInterceptor } from './response.interceptor'
import { of } from 'rxjs'

function makeContext(statusCode = 200) {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  } as any
}

function makeHandler(data: any) {
  return { handle: () => of(data) } as any
}

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>

  beforeEach(() => {
    interceptor = new ResponseInterceptor()
  })

  it('wraps response data with statusCode and message', (done) => {
    interceptor.intercept(makeContext(200), makeHandler({ id: 1 })).subscribe((result) => {
      expect(result.statusCode).toBe(200)
      expect(result.message).toBe('Success')
      expect(result.data).toEqual({ id: 1 })
      done()
    })
  })

  it('passes null data through', (done) => {
    interceptor.intercept(makeContext(204), makeHandler(null)).subscribe((result) => {
      expect(result.statusCode).toBe(204)
      expect(result.data).toBeNull()
      done()
    })
  })

  it('uses the actual HTTP status code from response', (done) => {
    interceptor.intercept(makeContext(201), makeHandler({ created: true })).subscribe((result) => {
      expect(result.statusCode).toBe(201)
      done()
    })
  })
})
