import dotenv from "dotenv";

dotenv.config({ quiet: true });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  // Prefer the non-SRV URI when present. This bypasses blocked _mongodb._tcp
  // SRV lookups while preserving an existing MONGODB_URI for other setups.
  mongoUri: process.env.MONGODB_DIRECT_URI?.trim() || required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET
};
