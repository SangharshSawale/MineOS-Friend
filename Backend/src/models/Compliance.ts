import { Document, Schema, model } from "mongoose";
import { EvidenceMetadata, evidenceSchema } from "./workflowTypes";

export const COMPLIANCE_STATUSES = ["compliant", "pending", "overdue", "under_review"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export const COMPLIANCE_CATEGORIES = [
  "DGMS Statutory",
  "Environmental Clearance",
  "Ventilation Standard",
  "Labour & Welfare",
  "Safety SOP",
  "Electrical Safety",
  "Explosives & Blasting"
] as const;
export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number] | (string & {});

export interface ICompliance extends Document {
  mineId: Schema.Types.ObjectId;
  requirement: string;
  category: string;
  dueDate: Date;
  expiry: Date;
  status: ComplianceStatus;
  responsiblePersonId: Schema.Types.ObjectId;
  evidence: EvidenceMetadata[];
  notes?: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const complianceSchema = new Schema<ICompliance>(
  {
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true },
    requirement: { type: String, required: true, trim: true, maxlength: 300 },
    category: { type: String, required: true, default: "DGMS Statutory", trim: true },
    dueDate: { type: Date, required: true },
    expiry: { type: Date, required: true },
    status: { type: String, enum: COMPLIANCE_STATUSES, default: "pending", required: true },
    responsiblePersonId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    evidence: { type: [evidenceSchema], default: [] },
    notes: { type: String, trim: true, maxlength: 5000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Compliance = model<ICompliance>("Compliance", complianceSchema);
