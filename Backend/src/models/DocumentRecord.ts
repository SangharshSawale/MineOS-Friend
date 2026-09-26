import { Document, Schema, model } from "mongoose";

export const DOCUMENT_CATEGORIES = [
  "DGMS Directive",
  "PESO License",
  "Environmental Clearance",
  "Mining Lease",
  "Safety Standard"
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface IDocumentRecord extends Document {
  title: string;
  referenceNo: string;
  category: DocumentCategory;
  issuer: string;
  validUntil: string;
  fileSize: string;
  format: "PDF" | "DOCX";
  status: "active" | "expiring_soon" | "archived";
  mineId?: Schema.Types.ObjectId;
  storageUrl?: string;
  uploadedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentRecordSchema = new Schema<IDocumentRecord>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    referenceNo: { type: String, required: true, trim: true, maxlength: 100, index: true },
    category: { type: String, enum: DOCUMENT_CATEGORIES, required: true, index: true },
    issuer: { type: String, required: true, trim: true, maxlength: 200 },
    validUntil: { type: String, required: true, trim: true },
    fileSize: { type: String, default: "1.5 MB" },
    format: { type: String, enum: ["PDF", "DOCX"], default: "PDF" },
    status: { type: String, enum: ["active", "expiring_soon", "archived"], default: "active", index: true },
    mineId: { type: Schema.Types.ObjectId, ref: "Mine" },
    storageUrl: { type: String, trim: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const DocumentRecord = model<IDocumentRecord>("DocumentRecord", documentRecordSchema);
