import { Test, TestingModule } from '@nestjs/testing'
import { CloudinaryService } from './cloudinary.service'

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
    },
    url: jest.fn().mockReturnValue('https://cloudinary.com/delivery-url'),
  },
}))

import { v2 as cloudinary } from 'cloudinary'

const mockUploadStream = cloudinary.uploader.upload_stream as jest.Mock

function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    buffer: Buffer.from('fake-content'),
    mimetype: 'image/jpeg',
    originalname: 'test-image.jpg',
    fieldname: 'file',
    encoding: '7bit',
    size: 1024,
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  }
}

describe('CloudinaryService', () => {
  let service: CloudinaryService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryService],
    }).compile()
    service = module.get<CloudinaryService>(CloudinaryService)
  })

  it('is defined', () => {
    expect(service).toBeDefined()
  })

  it('uploads image file successfully', async () => {
    const fakeResult = { public_id: 'folder/img-1', secure_url: 'https://img.url', version: 1 }
    const mockStream = { end: jest.fn() }
    mockUploadStream.mockImplementation((_opts: any, cb: any) => {
      cb(null, fakeResult)
      return mockStream
    })

    const result = await service.uploadFile(makeFile(), 'company/logo')
    expect(result.secure_url).toBe('https://img.url')
  })

  it('handles PDF upload with custom delivery URL', async () => {
    const fakeResult = { public_id: 'folder/doc-1', secure_url: 'original', version: 2 }
    const mockStream = { end: jest.fn() }
    mockUploadStream.mockImplementation((_opts: any, cb: any) => {
      cb(null, fakeResult)
      return mockStream
    })

    const result = await service.uploadFile(
      makeFile({ mimetype: 'application/pdf', originalname: 'document.pdf' }),
      'company/license',
    )
    expect(cloudinary.url).toHaveBeenCalledWith(
      'folder/doc-1',
      expect.objectContaining({ format: 'pdf', resource_type: 'image' }),
    )
    expect(result.secure_url).toBe('https://cloudinary.com/delivery-url')
  })

  it('handles raw file upload with extension in delivery URL', async () => {
    const fakeResult = { public_id: 'folder/raw-1', secure_url: 'original', version: 3 }
    const mockStream = { end: jest.fn() }
    mockUploadStream.mockImplementation((_opts: any, cb: any) => {
      cb(null, fakeResult)
      return mockStream
    })

    await service.uploadFile(
      makeFile({ mimetype: 'application/zip', originalname: 'archive.zip' }),
      'files',
    )
    expect(cloudinary.url).toHaveBeenCalledWith(
      expect.stringContaining('raw-1'),
      expect.objectContaining({ resource_type: 'raw' }),
    )
  })

  it('rejects when cloudinary returns an error', async () => {
    const mockStream = { end: jest.fn() }
    mockUploadStream.mockImplementation((_opts: any, cb: any) => {
      cb(new Error('Upload failed'), null)
      return mockStream
    })
    await expect(service.uploadFile(makeFile(), 'company/logo')).rejects.toThrow('Upload failed')
  })

  it('rejects when cloudinary returns no result', async () => {
    const mockStream = { end: jest.fn() }
    mockUploadStream.mockImplementation((_opts: any, cb: any) => {
      cb(null, null)
      return mockStream
    })
    await expect(service.uploadFile(makeFile(), 'company/logo')).rejects.toThrow('Upload failed')
  })
})
