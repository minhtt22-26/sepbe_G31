import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

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
      cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(new Error(error?.message || 'Upload failed'));
          resolve(result);
        },
      ).end(file.buffer);
    });
  }
}
