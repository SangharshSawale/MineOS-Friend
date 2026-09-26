import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Inspection } from "../models/Inspection";
import { Mine } from "../models/Mine";
import { User } from "../models/User";
import { CorrectiveAction } from "../models/CorrectiveAction";
import { Violation } from "../models/Violation";
import { normaliseEvidence } from "../models/workflowTypes";
import { recordAudit } from "../services/auditService";
import { asErrorMessage, assertTransition, inspectionTransitions, parseDate, validId } from "../services/workflowService";

export async function createInspection(request: AuthenticatedRequest, response: Response): Promise<void> {
  const body = request.body as Record<string, unknown>;
  if (!validId(body.mineId) || !validId(body.inspectorId) || typeof body.type !== "string") {
    response.status(400).json({ message: "mineId, inspectorId and type are required" }); return;
  }
  try {
    if (!(await Mine.exists({ _id: body.mineId })) || !(await User.exists({ _id: body.inspectorId }))) {
      response.status(404).json({ message: "Mine or inspector not found" }); return;
    }
    const status = (body.status ?? "draft") as "draft" | "in_progress" | "completed" | "follow_up_required";
    const completedOn = body.completedOn ? parseDate(body.completedOn, "completedOn") : undefined;
    if ((status === "completed" || status === "follow_up_required") && !completedOn) {
      response.status(400).json({ message: "completedOn is required for completed inspections" }); return;
    }
    const inspection = await Inspection.create({
      mineId: body.mineId, type: body.type, scheduledFor: parseDate(body.scheduledFor, "scheduledFor"),
      inspectorId: body.inspectorId, status, completedOn, location: body.location, gps: body.gps,
      observations: body.observations, evidence: normaliseEvidence(body.evidence, request.user!.id), createdBy: request.user!.id
    });
    await recordAudit(request, "inspection", inspection.id, "created", undefined, inspection.toObject());
    response.status(201).json(inspection);
  } catch (error) { response.status(400).json({ message: asErrorMessage(error) }); }
}

export async function listInspections(request: AuthenticatedRequest, response: Response): Promise<void> {
  const page = Math.max(Number(request.query.page) || 1, 1); const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.status) filter.status = request.query.status;
  if (request.query.inspectorId) filter.inspectorId = request.query.inspectorId;
  if (request.query.from || request.query.to) filter.scheduledFor = { ...(request.query.from ? { $gte: new Date(String(request.query.from)) } : {}), ...(request.query.to ? { $lte: new Date(String(request.query.to)) } : {}) };
  const [data, total] = await Promise.all([
    Inspection.find(filter).populate("mineId", "name code location").populate("inspectorId", "name email").sort({ scheduledFor: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Inspection.countDocuments(filter)
  ]);
  const enriched = await Promise.all(data.map(async (item) => ({ ...item, violationCount: await Violation.countDocuments({ inspectionId: item._id }), actionCount: await CorrectiveAction.countDocuments({ inspectionId: item._id }) })));
  response.json({ data: enriched, page, limit, total });
}

export async function getInspection(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) { response.status(404).json({ message: "Inspection not found" }); return; }
  const inspection = await Inspection.findById(request.params.id).populate("mineId", "name code location").populate("inspectorId", "name email").lean();
  if (!inspection) { response.status(404).json({ message: "Inspection not found" }); return; }
  const [violations, correctiveActions] = await Promise.all([
    Violation.find({ inspectionId: inspection._id }).populate("assignedTo", "name email").lean(),
    CorrectiveAction.find({ inspectionId: inspection._id }).populate("responsiblePersonId", "name email").lean()
  ]);
  response.json({ ...inspection, violations, correctiveActions });
}

export async function updateInspection(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) { response.status(404).json({ message: "Inspection not found" }); return; }
  const inspection = await Inspection.findById(request.params.id);
  if (!inspection) { response.status(404).json({ message: "Inspection not found" }); return; }
  const before = inspection.toObject(); const body = request.body as Record<string, unknown>;
  try {
    if (body.status) assertTransition(inspection.status, body.status as typeof inspection.status, inspectionTransitions, "inspection status");
    const nextStatus = (body.status ?? inspection.status) as typeof inspection.status;
    if ((nextStatus === "completed" || nextStatus === "follow_up_required") && !(body.completedOn || inspection.completedOn)) throw new Error("completedOn is required for completed inspections");
    const allowed = ["type", "scheduledFor", "completedOn", "status", "location", "gps", "observations", "evidence"];
    for (const key of allowed) {
      if (key in body) {
        if (key === "evidence") {
          const incoming = normaliseEvidence(body[key], request.user!.id);
          const existing = Array.isArray(inspection.evidence) ? inspection.evidence : [];
          (inspection as any).evidence = [...existing, ...incoming];
        } else if (key === "scheduledFor" || key === "completedOn") {
          (inspection as any)[key] = parseDate(body[key], key);
        } else {
          (inspection as any)[key] = body[key];
        }
      }
    }
    await inspection.save();
    await recordAudit(request, "inspection", inspection.id, "updated", before, inspection.toObject());
    response.json(inspection);
  } catch (error) { response.status(400).json({ message: asErrorMessage(error) }); }
}