import { apiClient } from '../services/api';

export interface CloudinaryUploadResponse {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Upload an image file to Cloudinary via backend
 * @param file - The image file to upload
 * @param folder - Optional folder name in Cloudinary (default: 'aerodine')
 * @returns Promise with upload response containing URL and metadata
 */
export async function uploadImageToCloudinary(
  file: File,
  folder?: string,
): Promise<CloudinaryUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const params = folder ? { folder } : {};
  const response = await apiClient.post('/cloudinary/upload', formData, {
    params,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Upload an image from URL to Cloudinary via backend
 * @param url - The image URL to upload
 * @param folder - Optional folder name in Cloudinary (default: 'aerodine')
 * @returns Promise with upload response containing URL and metadata
 */
export async function uploadImageFromUrl(
  url: string,
  folder?: string,
): Promise<CloudinaryUploadResponse> {
  const params: any = { url };
  if (folder) {
    params.folder = folder;
  }

  const response = await apiClient.post('/cloudinary/upload-url', null, {
    params,
  });

  return response.data;
}

/**
 * Get optimized Cloudinary image URL
 * @param publicId - Cloudinary public ID
 * @param options - Optional transformation options
 * @returns Optimized image URL
 */
export function getCloudinaryImageUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  },
): string {
  // If it's already a full URL, return as is
  if (publicId.startsWith('http')) {
    return publicId;
  }

  // Build transformation string
  const transformations: string[] = [];
  if (options?.width) transformations.push(`w_${options.width}`);
  if (options?.height) transformations.push(`h_${options.height}`);
  if (options?.quality) transformations.push(`q_${options.quality}`);
  if (options?.format) transformations.push(`f_${options.format}`);

  const transformStr = transformations.length > 0 ? `${transformations.join(',')}/` : '';
  
  // Extract cloud name from public ID or use default
  // For now, we'll construct a basic URL - in production, you'd get this from config
  const baseUrl = `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${transformStr}${publicId}`;
  
  return baseUrl;
}
