/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'MineOS',
  slug: 'mineos',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  plugins: [
    'expo-localization',
  ],
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0B192C',
    },
  },
  extra: {
    cloudinaryCloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
    cloudinaryUploadPreset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  },
};
