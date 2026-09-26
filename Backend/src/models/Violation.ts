import { Document, Schema, model } from "mongoose";
import { EvidenceMetadata, SEVERITIES, evidenceSchema, Severity } from "./workflowTypes";

export const VIOLATION_STATUSES = ["open", "under_review", "resolved"] as const;
export type ViolationStatus = (typeof VIOLATION_STATUSES)[number];

export interface IViolation extends Document {
  inspectionId: Schema.Types.ObjectId;
  mineId: Schema.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  severity: Severity;
  status: ViolationStatus;
  assignedTo: Schema.Types.ObjectId;
  deadline: Date;
  evidence: EvidenceMetadata[];
  resolvedAt?: Date;
  createdBy: Schema.Types.ObjectId;
}

const violationSchema = new Schema<IViolation>(
  {
    inspectionId: { type: Schema.Types.ObjectId, ref: "Inspection", required: true },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    category: { type: String, required: true, trim: true, maxlength: 150 },
    severity: { type: String, enum: SEVERITIES, required: true },
    status: { type: String, enum: VIOLATION_STATUSES, default: "open", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deadline: { type: Date, required: true },
    evidence: { type: [evidenceSchema], default: [] },
    resolvedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Violation = model<IViolation>("Violation", violationSchema);