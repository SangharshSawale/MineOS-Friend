import { Document, Schema, model } from "mongoose";

export interface IWorker extends Document {
  employeeCode: string;
  name: string;
  trade: string;
  mineId: Schema.Types.ObjectId;
  shift: "Shift A (Morning)" | "Shift B (Evening)" | "Shift C (Night)";
  attendanceStatus: "Present (Biometric Verified)" | "On Leave" | "Absent";
  trainingStatus: "Valid" | "Refresher Required";
  trainingValidUntil: string;
  medicalFitness: string;
  bloodGroup: string;
  emergencyContact: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workerSchema = new Schema<IWorker>(
  {
    employeeCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    trade: { type: String, required: true, trim: true },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true, index: true },
    shift: {
      type: String,
      enum: ["Shift A (Morning)", "Shift B (Evening)", "Shift C (Night)"],
      default: "Shift A (Morning)"
    },
    attendanceStatus: {
      type: String,
      enum: ["Present (Biometric Verified)", "On Leave", "Absent"],
      default: "Present (Biometric Verified)"
    },
    trainingStatus: { type: String, enum: ["Valid", "Refresher Required"], default: "Valid" },
    trainingValidUntil: { type: String, default: "31 Dec 2026" },
    medicalFitness: { type: String, default: "Valid Class I" },
    bloodGroup: { type: String, default: "O +ve" },
    emergencyContact: { type: String, trim: true },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const Worker = model<IWorker>("Worker", workerSchema);
