import { Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Types } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth";
import { isValidGps } from "../models/workflowTypes";
import { UploadedFile } from "../models/UploadedFile";

const uploadDir = path.resolve(__dirname, "../../uploads");

export async function uploadEvidenceFile(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  if (!request.file) {
    response.status(400).json({ message: "No file uploaded" });
    return;
  }

  let gps: { latitude: number; longitude: number } | undefined;
  if (request.body.gps) {
    try {
      const parsed = typeof request.body.gps === "string" ? JSON.parse(request.body.gps) : request.body.gps;
      if (isValidGps(parsed)) {
        gps = { latitude: Number(parsed.latitude), longitude: Number(parsed.longitude) };
      }
    } catch {
      // ignore invalid GPS JSON
    }
  } else if (request.body.latitude && request.body.longitude) {
    const candidate = {
      latitude: Number(request.body.latitude),
      longitude: Number(request.body.longitude)
    };
    if (isValidGps(candidate)) {
      gps = candidate;
    }
  }

  let fileBuffer: Buffer | undefined;
  let dataUri: string | undefined;

  try {
    if (request.file.path && fs.existsSync(request.file.path)) {
      fileBuffer = fs.readFileSync(request.file.path);
      dataUri = `data:${request.file.mimetype};base64,${fileBuffer.toString("base64")}`;
    }
  } catch (err) {
    console.warn("Could not read uploaded file buffer for MongoDB storage:", err);
  }

  // Persist into MongoDB Atlas UploadedFile collection
  try {
    const uploadedBy = request.user?.id && Types.ObjectId.isValid(request.user.id)
      ? new Types.ObjectId(request.user.id)
      : undefined;

    await UploadedFile.create({
      storageKey: request.file.filename,
      fileName: request.file.originalname,
      mimeType: request.file.mimetype,
      sizeBytes: request.file.size,
      data: fileBuffer,
      dataUri,
      uploadedBy
    });
  } catch (mongoErr) {
    console.warn("Failed to insert file into MongoDB UploadedFile collection:", mongoErr);
  }

  const evidenceItem = {
    id: crypto.randomUUID(),
    fileName: request.file.originalname,
    mimeType: request.file.mimetype,
    sizeBytes: request.file.size,
    storageKey: request.file.filename,
    url: `/api/uploads/${request.file.filename}`,
    dataUri,
    capturedAt: request.body.capturedAt ? new Date(request.body.capturedAt) : new Date(),
    gps,
    uploadedBy: request.user!.id,
    uploadedAt: new Date()
  };

  response.status(201).json({
    message: "File uploaded successfully",
    evidence: evidenceItem,
    url: `/api/uploads/${request.file.filename}`,
    dataUri
  });
}

export async function getEvidenceFile(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const rawKey = request.params.storageKey;
  const fileName = path.basename(Array.isArray(rawKey) ? rawKey[0] : String(rawKey));
  const filePath = path.join(uploadDir, fileName);

  // 1. Try serving from local disk cache
  if (fs.existsSync(filePath)) {
    response.sendFile(filePath);
    return;
  }

  // 2. Fallback: Retrieve binary buffer directly from MongoDB
  try {
    const fileDoc = await UploadedFile.findOne({ storageKey: fileName });
    if (fileDoc && fileDoc.data) {
      response.setHeader("Content-Type", fileDoc.mimeType);
      response.setHeader("Content-Disposition", `inline; filename="${fileDoc.fileName}"`);
      response.send(fileDoc.data);
      return;
    }
  } catch (err) {
    console.error("Error retrieving file from MongoDB:", err);
  }

  response.status(404).json({ message: "File not found" });
}
