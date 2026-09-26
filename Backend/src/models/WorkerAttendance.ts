import { Document, Schema, model } from "mongoose";

export const GEO_ATTENDANCE_STATUSES = ["Pending", "Present", "Absent", "AUTO_VERIFIED", "MANUAL_REVIEW", "REJECTED"] as const;
export type GeoAttendanceStatus = (typeof GEO_ATTENDANCE_STATUSES)[number];

export interface IWorkerAttendance extends Document {
  workerId?: Schema.Types.ObjectId;
  userId?: Schema.Types.ObjectId;
  mineId?: Schema.Types.ObjectId;
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  distanceFromMine?: number;
  gpsAccuracy?: number;
  verificationMethod?: "GPS_PHOTO" | "MANUAL";
  status: string;
  timestamp?: Date;
  date?: string;
  shift?: string;
  inTime?: string;
  outTime?: string;
  gate?: string;
}

const workerAttendanceSchema = new Schema<IWorkerAttendance>(
  {
    workerId: { type: Schema.Types.ObjectId, ref: "User" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine" },
    imageUrl: { type: String, trim: true },
    location: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 }
    },
    distanceFromMine: { type: Number, min: 0 },
    gpsAccuracy: { type: Number, min: 0 },
    verificationMethod: { type: String, enum: ["GPS_PHOTO", "MANUAL"] },
    status: {
      type: String,
      enum: [...GEO_ATTENDANCE_STATUSES, "Present (Biometric)"],
      default: "Pending"
    },
    timestamp: { type: Date },
    date: { type: String },
    shift: { type: String },
    inTime: { type: String },
    outTime: { type: String },
    gate: { type: String, default: "Turnstile Pit-Head #1" }
  },
  { timestamps: true }
);

export const WorkerAttendance = model<IWorkerAttendance>("WorkerAttendance", workerAttendanceSchema);

