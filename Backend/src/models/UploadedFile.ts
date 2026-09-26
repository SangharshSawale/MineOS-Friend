import { Document, Schema, model } from "mongoose";

export interface IUploadedFile extends Document {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data?: Buffer;
  dataUri?: string;
  uploadedBy?: Schema.Types.ObjectId;
  createdAt: Date;
}

const uploadedFileSchema = new Schema<IUploadedFile>(
  {
    storageKey: { type: String, required: true, unique: true, index: true },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    data: { type: Buffer },
    dataUri: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const UploadedFile = model<IUploadedFile>("UploadedFile", uploadedFileSchema);
