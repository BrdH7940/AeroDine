import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'

@Injectable()
export class CloudinaryService {
    constructor(private readonly configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        })
    }

    async uploadImage(
        file: string,
        folder = 'aerodine/menu-items'
    ): Promise<UploadApiResponse> {
        try {
            return await cloudinary.uploader.upload(file, {
                folder,
            })
        } catch (error) {
            throw new InternalServerErrorException('Failed to upload image')
        }
    }
}


