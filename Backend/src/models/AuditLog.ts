import { Document, Schema, model } from "mongoose";

export const AUDIT_ENTITY_TYPES = [
  "inspection",
  "violation",
  "corrective_action",
  "incident",
  "compliance",
  "mine",
  "contractor"
] as const;
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const AUDIT_CATEGORIES = [
  "USER_ACTIVITY",
  "CREATION",
  "MODIFICATION",
  "APPROVAL",
  "STATUS_CHANGE"
] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export interface IAuditLog extends Document {
  actorId: Schema.Types.ObjectId;
  entityType: AuditEntityType;
  entityId: Schema.Types.ObjectId;
  action: string;
  category: AuditCategory;
  hash?: string;
  previousHash?: string;
  ipAddress?: string;
  details?: string;
  before?: unknown;
  after?: unknown;
  occurredAt: Date;
  requestId?: string;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    entityType: { type: String, enum: AUDIT_ENTITY_TYPES, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    category: {
      type: String,
      enum: AUDIT_CATEGORIES,
      default: "USER_ACTIVITY",
      index: true
    },
    hash: { type: String, trim: true },
    previousHash: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    details: { type: String, trim: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    occurredAt: { type: Date, required: true, default: Date.now, index: true },
    requestId: { type: String, trim: true, maxlength: 200 }
  },
  { timestamps: false }
);

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);