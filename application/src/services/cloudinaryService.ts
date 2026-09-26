import {
  getCloudinaryCloudName,
  getCloudinaryUploadPreset,
  isCloudinaryConfigured,
} from '../config/env';
import { File } from 'expo-file-system';

export { isCloudinaryConfigured };

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  bytes: number;
  format?: string;
}

/**
 * Uploads a local image URI to Cloudinary using an unsigned upload preset.
 * Configure EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env,
 * then restart Expo with `npx expo start --clear`.
 */
export async function uploadImageToCloudinaryWithMetadata(
  localUri: string,
  fileName = 'attendance.jpg',
  folder = 'minsos/attendance',
): Promise<CloudinaryUploadResult> {
  const cloudName = getCloudinaryCloudName();
  const uploadPreset = getCloudinaryUploadPreset();

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in application/.env, then restart Expo with `npx expo start --clear`.',
    );
  }

  const normalizedUri =
    localUri.startsWith('file://') || localUri.startsWith('content://')
      ? localUri
      : `file://${localUri}`;

  // Expo 57 does not support React Native's legacy `{ uri, name, type }`
  // FormData part. Its File implementation supplies bytes(), which Expo's
  // multipart serializer supports without first loading the entire image into
  // a browser-style Blob.
  const imageFile = new File(normalizedUri);
  if (!imageFile.exists) {
    throw new Error('Unable to read the attendance image for upload');
  }

  const formData = new FormData();
  formData.append('file', imageFile, fileName);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  const payload = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    format?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message ?? 'Cloudinary upload failed');
  }

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id ?? payload.secure_url,
    bytes: payload.bytes ?? 0,
    format: payload.format,
  };
}

export async function uploadImageToCloudinary(localUri: string, fileName = 'attendance.jpg'): Promise<string> {
  const result = await uploadImageToCloudinaryWithMetadata(localUri, fileName);
  return result.secureUrl;
}
