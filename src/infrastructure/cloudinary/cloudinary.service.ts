import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { extname, basename } from 'path';

type CloudinaryUploadResult = {
  public_id: string;
  secure_url: string;
  url?: string;
  version?: number;
  format?: string;
  resource_type?: string;
};

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
    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const isPdf = file.mimetype === 'application/pdf';
      const resourceType = file.mimetype?.startsWith('image/') || isPdf ? 'image' : 'raw';
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
        },
        (error, result) => {
          if (error) return reject(new Error(error?.message || 'Upload failed'));

          if (!result) {
            return reject(new Error('Upload failed'));
          }

          if (resourceType === 'raw') {
            const normalizedPublicId = result.public_id.toLowerCase();
            const hasExtension = extension
              ? normalizedPublicId.endsWith(`.${extension}`)
              : false;
            const deliveryPublicId = extension && !hasExtension
              ? `${result.public_id}.${extension}`
              : result.public_id;
            const deliveryUrl = cloudinary.url(deliveryPublicId, {
              resource_type: 'raw',
              type: 'upload',
              secure: true,
              version: result.version,
            });

            return resolve({
              ...result,
              secure_url: deliveryUrl,
              url: deliveryUrl,
            });
          }

          if (isPdf) {
            const deliveryUrl = cloudinary.url(result.public_id, {
              resource_type: 'image',
              type: 'upload',
              secure: true,
              version: result.version,
              format: 'pdf',
            });

            return resolve({
              ...result,
              secure_url: deliveryUrl,
              url: deliveryUrl,
            });
          }

          resolve(result as CloudinaryUploadResult);
        },
      ).end(file.buffer);
    });
  }
}
