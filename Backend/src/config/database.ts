import mongoose from "mongoose";

export async function connectDatabase(uri: string): Promise<boolean> {
  try {
    await mongoose.connect(uri, {
      family: 4,
      serverSelectionTimeoutMS: 5_000,
    });
    console.log("MongoDB connected");
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`MongoDB connection unavailable; starting API without database access: ${message}`);
    return false;
  }
}
