import { uploadImageToCloudinaryWithMetadata } from './cloudinaryService';
import type { GeoTaggedImage } from '../types';

export interface UploadedEvidence {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url?: string;
  dataUri?: string;
  capturedAt?: string;
  gps?: { latitude: number; longitude: number };
  uploadedBy: string;
  uploadedAt: string;
}

export interface UploadGeoTaggedImageResponse {
  message: string;
  evidence: UploadedEvidence;
  url: string;
  dataUri?: string;
}

/**
 * Uploads image bytes directly to Cloudinary and returns evidence metadata
 * that is persisted with the subsequent authenticated hazard request.
 */
export async function uploadGeoTaggedImage(
  image: GeoTaggedImage,
  fileName = 'evidence.jpg',
): Promise<UploadedEvidence> {
  if (!image.uri) {
    throw new Error('Missing image URI for upload');
  }

  const normalizedUri =
    image.uri.startsWith('file://') || image.uri.startsWith('content://')
      ? image.uri
      : `file://${image.uri}`;

  const uploaded = await uploadImageToCloudinaryWithMetadata(
    normalizedUri,
    fileName,
    'minsos/hazard-reports',
  );

  return {
    id: uploaded.publicId,
    fileName,
    mimeType: uploaded.format ? `image/${uploaded.format}` : 'image/jpeg',
    sizeBytes: uploaded.bytes,
    storageKey: uploaded.publicId,
    url: uploaded.secureUrl,
    capturedAt: image.timestamp,
    gps: { latitude: image.latitude, longitude: image.longitude },
    // The backend replaces this with the authenticated reporter's ID.
    uploadedBy: '',
    uploadedAt: new Date().toISOString(),
  };
}
