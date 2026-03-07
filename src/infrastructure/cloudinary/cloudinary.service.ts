import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { extname, basename } from 'path';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string) {
    return new Promise((resolve, reject) => {
      const resourceType = file.mimetype?.startsWith('image/') ? 'image' : 'raw';
      const extension = extname(file.originalname || '').replace('.', '').toLowerCase();
      const fileName = basename(file.originalname || 'file', extname(file.originalname || ''));

      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          filename_override: file.originalname,
          public_id: `${Date.now()}-${fileName}`,
          ...(resourceType === 'raw' && extension ? { format: extension } : {}),
        },
        (error, result) => {
          if (error) return reject(new Error(error?.message || 'Upload failed'));
          resolve(result);
        },
      ).end(file.buffer);
    });
  }
}
