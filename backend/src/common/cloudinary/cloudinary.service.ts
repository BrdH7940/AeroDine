import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'

@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name)

    constructor(private readonly configService: ConfigService) {
        const cloudName =
            this.configService.get<string>('cloudinary.cloudName') ||
            this.configService.get<string>('CLOUDINARY_CLOUD_NAME')
        const apiKey =
            this.configService.get<string>('cloudinary.apiKey') ||
            this.configService.get<string>('CLOUDINARY_API_KEY')
        const apiSecret =
            this.configService.get<string>('cloudinary.apiSecret') ||
            this.configService.get<string>('CLOUDINARY_API_SECRET')

        if (!cloudName || !apiKey || !apiSecret) {
            this.logger.warn(
                'Cloudinary credentials not configured. Image upload will fail.'
            )
        }

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
        })
    }

    async uploadImage(
        file: string,
        folder = 'aerodine/menu-items'
    ): Promise<UploadApiResponse> {
        try {
            if (!file || typeof file !== 'string') {
                throw new Error('Invalid image data: must be a string (base64 or URL)')
            }

            let imageData = file

            // Check if it's a base64 data URI, a URL, or plain base64
            const isBase64DataUri = file.startsWith('data:')
            const isUrl = file.startsWith('http://') || file.startsWith('https://')

            // If it's plain base64 (no prefix), add data URI prefix
            if (!isBase64DataUri && !isUrl) {
                // Assume it's plain base64 and add data URI prefix
                // Try to detect image type from base64 or default to jpeg
                // Cloudinary can handle base64 with 'data:image/jpeg;base64,' prefix
                this.logger.debug('Detected plain base64, adding data URI prefix')
                imageData = `data:image/jpeg;base64,${file}`
            }

            this.logger.debug(`Uploading image to Cloudinary folder: ${folder}`)
            const result = await cloudinary.uploader.upload(imageData, {
                folder,
            })
            this.logger.debug('Image uploaded successfully to Cloudinary')
            return result
        } catch (error) {
            this.logger.error('Cloudinary upload error', {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
            })
            throw new InternalServerErrorException(
                `Failed to upload image: ${
                    error instanceof Error ? error.message : 'Unknown error'
                }`
            )
        }
    }
}


