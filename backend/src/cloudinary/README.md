# Cloudinary Integration

Module này cung cấp tích hợp Cloudinary để upload và quản lý hình ảnh trong ứng dụng AeroDine.

## Cấu hình

Thêm các biến môi trường sau vào `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## API Endpoints

### POST `/api/cloudinary/upload`

Upload một file hình ảnh lên Cloudinary.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data với field `file` (File)
- Query params:
  - `folder` (optional): Thư mục lưu trữ trong Cloudinary (mặc định: `aerodine`)

**Response:**
```json
{
  "publicId": "aerodine/image-name",
  "url": "https://res.cloudinary.com/...",
  "width": 1920,
  "height": 1080,
  "format": "jpg"
}
```

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/cloudinary/upload?folder=menu-items \
  -F "file=@/path/to/image.jpg"
```

### POST `/api/cloudinary/upload-url`

Upload một hình ảnh từ URL lên Cloudinary.

**Request:**
- Method: `POST`
- Query params:
  - `url` (required): URL của hình ảnh
  - `folder` (optional): Thư mục lưu trữ trong Cloudinary (mặc định: `aerodine`)

**Response:**
```json
{
  "publicId": "aerodine/image-name",
  "url": "https://res.cloudinary.com/...",
  "width": 1920,
  "height": 1080,
  "format": "jpg"
}
```

## Sử dụng trong Service

```typescript
import { CloudinaryService } from './cloudinary/cloudinary.service';

@Injectable()
export class YourService {
  constructor(private cloudinaryService: CloudinaryService) {}

  async uploadMenuItemImage(file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadImage(
      file,
      'menu-items'
    );
    return result.secure_url;
  }
}
```

## Giới hạn

- Kích thước file tối đa: 5MB
- Định dạng được hỗ trợ: JPG, JPEG, PNG, GIF, WEBP
