import { Document, Schema, model } from "mongoose";
import { EvidenceMetadata, evidenceSchema } from "./workflowTypes";

export const INSPECTION_STATUSES = ["draft", "in_progress", "completed", "follow_up_required"] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export interface IInspection extends Document {
  mineId: Schema.Types.ObjectId;
  type: string;
  scheduledFor: Date;
  completedOn?: Date;
  inspectorId: Schema.Types.ObjectId;
  status: InspectionStatus;
  location?: string;
  gps?: { latitude: number; longitude: number; accuracyMeters?: number; capturedAt?: Date };
  observations?: string;
  evidence: EvidenceMetadata[];
  createdBy: Schema.Types.ObjectId;
}

const inspectionSchema = new Schema<IInspection>(
  {
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true },
    type: { type: String, required: true, trim: true, maxlength: 150 },
    scheduledFor: { type: Date, required: true },
    completedOn: { type: Date },
    inspectorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: INSPECTION_STATUSES, default: "draft", required: true },
    location: { type: String, trim: true, maxlength: 300 },
    gps: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      accuracyMeters: { type: Number, min: 0 },
      capturedAt: { type: Date }
    },
    observations: { type: String, trim: true, maxlength: 10000 },
    evidence: { type: [evidenceSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Inspection = model<IInspection>("Inspection", inspectionSchema);