import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { SafetyObservation } from "../models/SafetyObservation";
import { Alert } from "../models/Alert";
import { recordAudit } from "../services/auditService";
import { Mine } from "../models/Mine";

export async function listObservations(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.severity) filter.severity = request.query.severity;
  if (request.query.category) filter.category = request.query.category;
  if (request.query.status) filter.status = request.query.status;

  const data = await SafetyObservation.find(filter)
    .populate("mineId", "name code")
    .populate("reportedBy", "name email role")
    .sort({ createdAt: -1 })
    .lean();

  response.json({ data, total: data.length });
}

export async function createObservation(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const { title, category, location, mineId, severity, photoEvidenceUrl, notes } = request.body;

  let targetMineId = mineId;
  if (!targetMineId) {
    const defaultMine = await Mine.findOne({}).select("_id").lean();
    targetMineId = defaultMine?._id;
  }

  if (!title || !category || !location) {
    response.status(400).json({ message: "Missing required hazard observation fields" });
    return;
  }

  const observation = await SafetyObservation.create({
    title,
    category,
    location,
    mineId: targetMineId,
    severity: severity || "high",
    reportedBy: request.user!.id,
    status: "Open Observation",
    photoEvidenceUrl: photoEvidenceUrl || undefined,
    notes: notes || undefined
  });

  // Automatically trigger Alert dispatch if critical or high
  if (severity === "critical" || severity === "high") {
    await Alert.create({
      type: "critical_violation",
      severity: severity === "critical" ? "critical" : "high",
      title: `Frontline Hazard Reported: ${title}`,
      message: `Observed at ${location}. Category: ${category}. Reported by User (${request.user!.id}).`,
      mineId: targetMineId,
      relatedEntityType: "violation",
      relatedEntityId: observation._id,
      isRead: false
    });
  }

  await recordAudit(request, "violation", String(observation._id), "log_safety_observation", undefined, {
    title,
    severity,
    location
  });

  response.status(201).json(observation);
}

export async function updateObservationStatus(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const { status, notes } = request.body;
  const observation = await SafetyObservation.findById(request.params.id);

  if (!observation) {
    response.status(404).json({ message: "Observation not found" });
    return;
  }

  observation.status = status || "Rectified";
  if (status === "Rectified") observation.rectifiedAt = new Date();
  if (notes) observation.notes = notes;
  await observation.save();

  await recordAudit(request, "violation", String(observation._id), "rectify_safety_observation", undefined, {
    status: observation.status
  });

  response.json(observation);
}
