import { Response } from "express";
import { Schema } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth";
import { Incident } from "../models/Incident";
import { Inspection } from "../models/Inspection";
import { Mine } from "../models/Mine";
import { User } from "../models/User";
import { normaliseEvidence, SEVERITIES } from "../models/workflowTypes";
import { createAlert, resolveAlertByEntity } from "../services/alertService";
import { recordAudit } from "../services/auditService";
import { asErrorMessage, parseDate, validId } from "../services/workflowService";

export async function createIncident(request: AuthenticatedRequest, response: Response): Promise<void> {
  const body = request.body as Record<string, unknown>;

  if (
    !validId(body.mineId) ||
    typeof body.title !== "string" ||
    typeof body.description !== "string" ||
    !SEVERITIES.includes(body.severity as never)
  ) {
    response.status(400).json({
      message: "mineId, title, description and valid severity (critical, high, medium, low) are required"
    });
    return;
  }

  try {
    const mine = await Mine.findById(body.mineId);
    if (!mine) {
      response.status(404).json({ message: "Mine not found" });
      return;
    }

    const occurredAt = parseDate(body.occurredAt ?? new Date(), "occurredAt");
    const severity = body.severity as "critical" | "high" | "medium" | "low";

    const incident = new Incident({
      mineId: body.mineId,
      inspectionId: validId(body.inspectionId) ? body.inspectionId : undefined,
      occurredAt,
      title: body.title.trim(),
      description: body.description.trim(),
      severity,
      status: "reported",
      evidence: normaliseEvidence(body.evidence, request.user!.id),
      reportedBy: request.user!.id
    });

    // Automated Linkage for High / Critical incidents
    if (severity === "critical" || severity === "high") {
      // 1. Immediate Persistent Alert
      await createAlert({
        type: "incident",
        severity,
        title: `${severity.toUpperCase()} Incident Reported: ${incident.title}`,
        message: `An incident with ${severity} severity was reported at ${mine.name}: ${incident.description.slice(0, 150)}`,
        mineId: mine._id as unknown as string,
        relatedEntityId: incident._id as unknown as string,
        relatedEntityType: "incident"
      });

      // 2. Automatically trigger Priority Inspection
      // Find an inspector or safety officer for assignment, fallback to current user or admin
      const assignedInspector =
        (await User.findOne({ role: { $in: ["inspector", "safety_officer"] } }).select("_id").lean()) ??
        (await User.findById(request.user!.id).select("_id").lean());

      if (assignedInspector) {
        const priorityInspection = await Inspection.create({
          mineId: mine._id,
          type: "Emergency Incident Inspection",
          scheduledFor: new Date(),
          inspectorId: assignedInspector._id,
          status: "in_progress",
          observations: `[AUTOMATED PRIORITY INSPECTION] Triggered by ${severity.toUpperCase()} incident: ${incident.title}. Immediate on-site assessment required.`,
          evidence: [],
          createdBy: request.user!.id
        });

        incident.priorityInspectionId = priorityInspection._id as unknown as Schema.Types.ObjectId;
      }
    }

    await incident.save();
    await recordAudit(request, "incident", incident.id, "created", undefined, incident.toObject());

    response.status(201).json(incident);
  } catch (error) {
    response.status(400).json({ message: asErrorMessage(error) });
  }
}

export async function listIncidents(request: AuthenticatedRequest, response: Response): Promise<void> {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);

  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.severity) filter.severity = request.query.severity;
  if (request.query.status) filter.status = request.query.status;
  if (request.query.from || request.query.to) {
    filter.occurredAt = {
      ...(request.query.from ? { $gte: new Date(String(request.query.from)) } : {}),
      ...(request.query.to ? { $lte: new Date(String(request.query.to)) } : {})
    };
  }

  const [data, total] = await Promise.all([
    Incident.find(filter)
      .populate("mineId", "name code location")
      .populate("reportedBy", "name email role")
      .populate("investigatorId", "name email role")
      .populate("priorityInspectionId", "type status scheduledFor")
      .populate("closedBy", "name email role")
      .sort({ occurredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Incident.countDocuments(filter)
  ]);

  response.json({
    data: data.map((item) => ({ ...item, evidenceCount: item.evidence.length })),
    page,
    limit,
    total
  });
}

export async function getIncident(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) {
    response.status(404).json({ message: "Incident not found" });
    return;
  }

  const incident = await Incident.findById(request.params.id)
    .populate("mineId", "name code location")
    .populate("reportedBy", "name email role")
    .populate("investigatorId", "name email role")
    .populate("priorityInspectionId", "type status scheduledFor observations")
    .populate("closedBy", "name email role")
    .lean();

  if (!incident) {
    response.status(404).json({ message: "Incident not found" });
    return;
  }

  response.json(incident);
}

export async function investigateIncident(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) {
    response.status(404).json({ message: "Incident not found" });
    return;
  }

  const incident = await Incident.findById(request.params.id);
  if (!incident) {
    response.status(404).json({ message: "Incident not found" });
    return;
  }

  if (incident.status === "closed") {
    response.status(400).json({ message: "Closed incidents cannot be reopened for investigation" });
    return;
  }

  const before = incident.toObject();
  const body = request.body as Record<string, unknown>;

  incident.status = "investigating";
  incident.investigatorId = (validId(body.investigatorId) ? body.investigatorId : request.user!.id) as unknown as Schema.Types.ObjectId;
  if (typeof body.investigationNotes === "string") {
    incident.investigationNotes = body.investigationNotes.trim();
  }
  if ("evidence" in body && Array.isArray(body.evidence)) {
    const newEv = normaliseEvidence(body.evidence, request.user!.id);
    incident.evidence = [...(incident.evidence || []), ...newEv];
  }

  await incident.save();
  await recordAudit(request, "incident", incident.id, "investigating", before, incident.toObject());

  response.json(incident);
}

export async function closeIncident(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) {
    response.status(404).json({ message: "Incident not found" });
    return;
  }

  const incident = await Incident.findById(request.params.id);
  if (!incident) {
    response.status(404).json({ message: "Incident not found" });
    return;
  }

  const before = incident.toObject();
  const body = request.body as Record<string, unknown>;

  incident.status = "closed";
  incident.closedAt = new Date();
  incident.closedBy = request.user!.id as unknown as Schema.Types.ObjectId;
  if (typeof body.closureNotes === "string") {
    incident.closureNotes = body.closureNotes.trim();
  }
  if ("evidence" in body && Array.isArray(body.evidence)) {
    const newEv = normaliseEvidence(body.evidence, request.user!.id);
    incident.evidence = [...(incident.evidence || []), ...newEv];
  }

  await incident.save();
  await resolveAlertByEntity(incident.id);
  await recordAudit(request, "incident", incident.id, "closed", before, incident.toObject());

  response.json(incident);
}
