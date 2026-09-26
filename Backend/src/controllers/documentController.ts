import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { DocumentRecord } from "../models/DocumentRecord";
import { recordAudit } from "../services/auditService";

export async function listDocuments(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (request.query.category) filter.category = request.query.category;
  if (request.query.mineId) filter.mineId = request.query.mineId;

  if (request.query.search) {
    const q = String(request.query.search).trim();
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { referenceNo: { $regex: q, $options: "i" } },
      { issuer: { $regex: q, $options: "i" } }
    ];
  }

  const data = await DocumentRecord.find(filter)
    .populate("mineId", "name code")
    .populate("uploadedBy", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  response.json({ data, total: data.length });
}

export async function createDocument(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const { title, referenceNo, category, issuer, validUntil, fileSize, format, status, mineId, storageUrl } =
    request.body;

  if (!title || !referenceNo || !category || !issuer || !validUntil) {
    response.status(400).json({ message: "Missing required document attributes" });
    return;
  }

  const doc = await DocumentRecord.create({
    title,
    referenceNo,
    category,
    issuer,
    validUntil,
    fileSize: fileSize || "1.5 MB",
    format: format || "PDF",
    status: status || "active",
    mineId: mineId || undefined,
    storageUrl: storageUrl || undefined,
    uploadedBy: request.user!.id
  });

  await recordAudit(request, "compliance", String(doc._id), "create_document", undefined, {
    title,
    referenceNo,
    category
  });

  response.status(201).json(doc);
}

export async function deleteDocument(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const doc = await DocumentRecord.findByIdAndDelete(request.params.id);
  if (!doc) {
    response.status(404).json({ message: "Document not found" });
    return;
  }

  await recordAudit(request, "compliance", String(doc._id), "delete_document", { title: doc.title }, undefined);
  response.json({ message: "Document removed successfully" });
}
