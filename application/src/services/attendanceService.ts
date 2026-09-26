import api, { logApiError } from './api';
import { uploadImageToCloudinary } from './cloudinaryService';
import type { GeoTaggedImage } from '../types';

export interface AttendanceCheckInPayload {
  imageUrl: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  /** GPS horizontal accuracy from the device, in metres. */
  accuracyMeters?: number;
  /** Mine/colliery the worker belongs to. */
  mineId?: string;
}

export interface AttendanceCheckInResult {
  _id: string;
  status: string;
  verificationStatus?: string;
  distanceFromMine?: number;
  message?: string;
}

async function uploadAttendanceImage(image: GeoTaggedImage): Promise<string> {
  if (!image.uri) {
    throw new Error('Missing image URI for upload');
  }
  // Upload directly from the worker device using EXPO_PUBLIC_ Cloudinary settings.
  return uploadImageToCloudinary(image.uri, 'attendance.jpg');
}

export async function submitAttendanceCheckIn(
  image: GeoTaggedImage,
  mineId?: string,
): Promise<AttendanceCheckInResult> {
  try {
    const imageUrl = await uploadAttendanceImage(image);

    const payload: AttendanceCheckInPayload = {
      imageUrl,
      latitude: image.latitude,
      longitude: image.longitude,
      timestamp: image.timestamp,
      ...(image.accuracyMeters !== undefined ? { accuracyMeters: image.accuracyMeters } : {}),
      ...(mineId ? { mineId } : {}),
    };

    const response = await api.post<AttendanceCheckInResult>('/attendance/check-in', payload);
    return response.data;
  } catch (err) {
    logApiError('submitAttendanceCheckIn', err);
    throw err;
  }
}
