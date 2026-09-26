import { Document, Schema, model } from "mongoose";

export const CONTRACTOR_STATUSES = ["compliant", "pending", "suspended"] as const;
export type ContractorStatus = (typeof CONTRACTOR_STATUSES)[number];

export interface IContractor extends Document {
  companyName: string;
  contractNumber: string;
  mineId: Schema.Types.ObjectId;
  workType: string;
  safetyRating: number;
  activeWorkers: number;
  complianceStatus: ContractorStatus;
  insuranceExpiry: Date;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const contractorSchema = new Schema<IContractor>(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    contractNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true },
    workType: { type: String, required: true, trim: true, maxlength: 150 },
    safetyRating: { type: Number, required: true, min: 0, max: 100, default: 85 },
    activeWorkers: { type: Number, required: true, min: 0, default: 10 },
    complianceStatus: { type: String, enum: CONTRACTOR_STATUSES, default: "compliant", required: true },
    insuranceExpiry: { type: Date, required: true },
    contactName: { type: String, required: true, trim: true, maxlength: 120 },
    contactPhone: { type: String, required: true, trim: true, maxlength: 30 },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Contractor = model<IContractor>("Contractor", contractorSchema);
