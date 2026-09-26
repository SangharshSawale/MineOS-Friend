/** EXPO_PUBLIC_* variables are inlined by Expo/Metro at bundle time. */
export function getCloudinaryCloudName(): string {
  return process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? '';
}

export function getCloudinaryUploadPreset(): string {
  return process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() ?? '';
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(getCloudinaryCloudName() && getCloudinaryUploadPreset());
}
