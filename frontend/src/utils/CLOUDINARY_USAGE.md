# Sử dụng Cloudinary trong Frontend

File này hướng dẫn cách sử dụng Cloudinary utility trong frontend.

## Import

```typescript
import { uploadImageToCloudinary, uploadImageFromUrl } from '../utils/cloudinary';
```

## Upload File

```typescript
const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const result = await uploadImageToCloudinary(file, 'menu-items');
    console.log('Image URL:', result.url);
    // Sử dụng result.url để lưu vào database
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## Upload từ URL

```typescript
const handleUrlUpload = async (imageUrl: string) => {
  try {
    const result = await uploadImageFromUrl(imageUrl, 'menu-items');
    console.log('Image URL:', result.url);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## Component Example

```typescript
import React, { useState } from 'react';
import { uploadImageToCloudinary } from '../utils/cloudinary';

export const ImageUploader: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImageToCloudinary(file, 'menu-items');
      setImageUrl(result.url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {imageUrl && <img src={imageUrl} alt="Uploaded" />}
    </div>
  );
};
```
