import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        resource_type: 'image',
      };

      if (folder) {
        uploadOptions.folder = folder;
      }

      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as UploadApiResponse);
          }
        })
        .end(file.buffer);
    });
  }

  async uploadImageFromUrl(
    url: string,
    folder?: string,
  ): Promise<UploadApiResponse> {
    const uploadOptions: any = {
      resource_type: 'image',
    };

    if (folder) {
      uploadOptions.folder = folder;
    }

    return cloudinary.uploader.upload(url, uploadOptions);
  }

  async deleteImage(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  getImageUrl(publicId: string, options?: any): string {
    return cloudinary.url(publicId, options);
  }
}
