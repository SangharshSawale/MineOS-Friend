import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

let configured = false;

export function configureCloudinary(): boolean {
  if (configured) {
    return true;
  }

  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true
  });

  configured = true;
  return true;
}

export { cloudinary };
