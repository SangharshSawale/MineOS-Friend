import { Document, Schema, model } from "mongoose";

export interface IApprovalRequest extends Document {
  title: string;
  category: "Corrective Action Verification" | "Incident Closure" | "Blasting Permit" | "Overtime Clearance";
  mineId: Schema.Types.ObjectId;
  submittedBy: Schema.Types.ObjectId;
  reviewedBy?: Schema.Types.ObjectId;
  urgency: "critical" | "high" | "normal";
  status: "pending" | "approved" | "rejected";
  notes?: string;
  submittedAt: Date;
  reviewedAt?: Date;
}

const approvalRequestSchema = new Schema<IApprovalRequest>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Corrective Action Verification", "Incident Closure", "Blasting Permit", "Overtime Clearance"],
      required: true,
      index: true
    },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true, index: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    urgency: { type: String, enum: ["critical", "high", "normal"], default: "normal" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    notes: { type: String, trim: true },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date }
  },
  { timestamps: true }
);

export const ApprovalRequest = model<IApprovalRequest>("ApprovalRequest", approvalRequestSchema);
