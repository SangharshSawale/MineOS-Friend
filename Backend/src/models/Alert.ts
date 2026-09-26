import { Document, Schema, model } from "mongoose";

export const ALERT_TYPES = [
  "critical_violation",
  "overdue_action",
  "incident",
  "overdue_inspection",
  "upcoming_deadline",
  "high_risk_mine",
  "action_assigned",
  "evidence_submitted",
  "action_verified",
  "all_actions_completed",
  "action_rejected"
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const RELATED_ENTITY_TYPES = [
  "violation",
  "corrective_action",
  "incident",
  "inspection",
  "compliance",
  "mine"
] as const;
export type RelatedEntityType = (typeof RELATED_ENTITY_TYPES)[number];

export interface IAlert extends Document {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  mineId: Schema.Types.ObjectId;
  relatedEntityId?: Schema.Types.ObjectId;
  relatedEntityType?: RelatedEntityType;
  isRead: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 250 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true },
    relatedEntityId: { type: Schema.Types.ObjectId },
    relatedEntityType: { type: String, enum: RELATED_ENTITY_TYPES },
    isRead: { type: Boolean, default: false, index: true },
    resolvedAt: { type: Date }
  },
  { timestamps: true }
);

export const Alert = model<IAlert>("Alert", alertSchema);
