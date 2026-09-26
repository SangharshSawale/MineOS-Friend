import { Document, Schema, model } from "mongoose";
import { EvidenceMetadata, SEVERITIES, evidenceSchema, Severity } from "./workflowTypes";

export const INCIDENT_STATUSES = ["reported", "investigating", "closed"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface IIncident extends Document {
  mineId: Schema.Types.ObjectId;
  inspectionId?: Schema.Types.ObjectId;
  priorityInspectionId?: Schema.Types.ObjectId;
  occurredAt: Date;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  evidence: EvidenceMetadata[];
  reportedBy: Schema.Types.ObjectId;
  investigatorId?: Schema.Types.ObjectId;
  investigationNotes?: string;
  closureNotes?: string;
  closedAt?: Date;
  closedBy?: Schema.Types.ObjectId;
}

const incidentSchema = new Schema<IIncident>(
  {
    mineId: { type: Schema.Types.ObjectId, ref: "Mine", required: true },
    inspectionId: { type: Schema.Types.ObjectId, ref: "Inspection" },
    priorityInspectionId: { type: Schema.Types.ObjectId, ref: "Inspection" },
    occurredAt: { type: Date, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    severity: { type: String, enum: SEVERITIES, required: true },
    status: { type: String, enum: INCIDENT_STATUSES, default: "reported", required: true },
    evidence: { type: [evidenceSchema], default: [] },
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    investigatorId: { type: Schema.Types.ObjectId, ref: "User" },
    investigationNotes: { type: String, trim: true, maxlength: 5000 },
    closureNotes: { type: String, trim: true, maxlength: 5000 },
    closedAt: { type: Date },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export const Incident = model<IIncident>("Incident", incidentSchema);