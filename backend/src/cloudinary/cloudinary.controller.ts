import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { memoryStorage } from 'multer';

const storage = memoryStorage();

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.cloudinaryService.uploadImage(
        file,
        folder || 'aerodine',
      );

      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload image');
    }
  }

  @Post('upload-url')
  async uploadFromUrl(
    @Query('url') url: string,
    @Query('folder') folder?: string,
  ) {
    if (!url) {
      throw new BadRequestException('URL is required');
    }

    try {
      const result = await this.cloudinaryService.uploadImageFromUrl(
        url,
        folder || 'aerodine',
      );

      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      throw new BadRequestException('Failed to upload image from URL');
    }
  }
}
