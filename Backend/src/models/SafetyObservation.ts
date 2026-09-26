import { Document, Schema, model } from "mongoose";

export interface ISafetyObservation extends Document {
  title: string;
  category: "Strata Control" | "Gas Telemetry" | "Haulage Road" | "Electrical Flameproof" | "Ventilation";
  location: string;
  mineId: Schema.Types.ObjectId;
  severity: "critical" | "high" | "medium" | "low";
  reportedBy: Schema.Types.ObjectId;
  status: "Open Observation" | "Investigating" | "Rectified";
  photoEvidenceUrl?: string;
  notes?: string;
  createdAt: Date;
  rectifiedAt?: Date;
}

const safetyObservationSchema = new Schema<ISafetyObservation>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Strata Control", "Gas Telemetry", "Haulage Road", "Electrical Flameproof", "Ventilation"],
      required: true,
      index: true
    },
    location: { type: String, required: true, trim: true },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true, index: true },
    severity: { type: String, enum: ["critical", "high", "medium", "low"], default: "high", index: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Open Observation", "Investigating", "Rectified"],
      default: "Open Observation",
      index: true
    },
    photoEvidenceUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    rectifiedAt: { type: Date }
  },
  { timestamps: true }
);

export const SafetyObservation = model<ISafetyObservation>("SafetyObservation", safetyObservationSchema);
