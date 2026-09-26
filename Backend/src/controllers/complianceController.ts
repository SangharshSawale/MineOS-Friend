import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Compliance, COMPLIANCE_STATUSES } from "../models/Compliance";
import { Mine } from "../models/Mine";
import { User } from "../models/User";
import { WorkerTask } from "../models/WorkerTask";
import { normaliseEvidence } from "../models/workflowTypes";
import { resolveAlertByEntity } from "../services/alertService";
import { recordAudit } from "../services/auditService";
import { asErrorMessage, parseDate, validId } from "../services/workflowService";

export async function createCompliance(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const body = request.body as Record<string, unknown>;

  if (
    !validId(body.mineId) ||
    !validId(body.responsiblePersonId) ||
    typeof body.requirement !== "string" ||
    !body.requirement.trim()
  ) {
    response.status(400).json({
      message: "mineId, responsiblePersonId, and requirement title are required"
    });
    return;
  }

  try {
    const [mineExists, userExists] = await Promise.all([
      Mine.exists({ _id: body.mineId }),
      User.exists({ _id: body.responsiblePersonId })
    ]);

    if (!mineExists || !userExists) {
      response.status(404).json({ message: "Mine or responsible person not found" });
      return;
    }

    const dueDate = parseDate(body.dueDate ?? new Date(), "dueDate");
    const expiry = parseDate(body.expiry ?? new Date(Date.now() + 365 * 86400000), "expiry");
    const status = body.status && COMPLIANCE_STATUSES.includes(body.status as never)
      ? body.status
      : "pending";

    const compliance = await Compliance.create({
      mineId: body.mineId,
      requirement: body.requirement.trim(),
      category: typeof body.category === "string" ? body.category.trim() : "DGMS Statutory",
      dueDate,
      expiry,
      status,
      responsiblePersonId: body.responsiblePersonId,
      evidence: normaliseEvidence(body.evidence, request.user!.id),
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
      createdBy: request.user!.id
    });

    // Auto-create an assigned action (WorkerTask) for the responsible officer
    const priorityMap: Record<string, string> = {
      "DGMS Statutory": "High",
      "Safety SOP": "High",
      "Electrical Safety": "High",
      "Explosives & Blasting": "Critical",
      "Environmental Clearance": "Medium",
      "Ventilation Standard": "Medium",
      "Labour & Welfare": "Medium"
    };
    const category = typeof body.category === "string" ? body.category.trim() : "DGMS Statutory";

    await WorkerTask.create({
      userId: body.responsiblePersonId,
      mineId: body.mineId,
      complianceId: compliance._id,
      title: body.requirement.trim(),
      category,
      status: "Pending",
      priority: priorityMap[category] || "Medium",
      dueDate,
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
      assignedAt: new Date(),
      done: false,
      time: "Pending",
      date: new Date().toISOString().slice(0, 10)
    });

    await recordAudit(request, "compliance" as never, compliance.id, "created", undefined, compliance.toObject());
    response.status(201).json(compliance);
  } catch (error) {
    response.status(400).json({ message: asErrorMessage(error) });
  }
}

export async function listCompliance(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);

  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.status) filter.status = request.query.status;
  if (request.query.category) filter.category = request.query.category;
  if (request.query.responsiblePersonId) filter.responsiblePersonId = request.query.responsiblePersonId;
  if (request.query.overdue === "true") {
    filter.status = { $in: ["pending", "under_review", "overdue"] };
    filter.dueDate = { $lt: new Date() };
  }

  const [data, total] = await Promise.all([
    Compliance.find(filter)
      .populate("mineId", "name code location")
      .populate("responsiblePersonId", "name email role")
      .populate("createdBy", "name email")
      .sort({ dueDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Compliance.countDocuments(filter)
  ]);

  const now = new Date();
  const enriched = data.map((item) => {
    const isOverdue =
      item.status !== "compliant" && new Date(item.dueDate).getTime() < now.getTime();
    return {
      ...item,
      effectiveStatus: isOverdue ? "overdue" : item.status,
      evidenceCount: item.evidence.length
    };
  });

  response.json({ data: enriched, total, page, limit });
}

export async function updateCompliance(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  if (!validId(request.params.id)) {
    response.status(404).json({ message: "Compliance requirement not found" });
    return;
  }

  const compliance = await Compliance.findById(request.params.id);
  if (!compliance) {
    response.status(404).json({ message: "Compliance requirement not found" });
    return;
  }

  const before = compliance.toObject();
  const body = request.body as Record<string, unknown>;

  try {
    if (body.status && COMPLIANCE_STATUSES.includes(body.status as never)) {
      compliance.status = body.status as typeof compliance.status;
      if (compliance.status === "compliant") {
        await resolveAlertByEntity(compliance.id);
      }
    }

    if (typeof body.requirement === "string" && body.requirement.trim()) {
      compliance.requirement = body.requirement.trim();
    }
    if (typeof body.category === "string" && body.category.trim()) {
      compliance.category = body.category.trim();
    }
    if (body.dueDate) {
      compliance.dueDate = parseDate(body.dueDate, "dueDate");
    }
    if (body.expiry) {
      compliance.expiry = parseDate(body.expiry, "expiry");
    }
    if (validId(body.responsiblePersonId)) {
      compliance.responsiblePersonId = body.responsiblePersonId as never;
    }
    if ("evidence" in body && Array.isArray(body.evidence)) {
      const newEv = normaliseEvidence(body.evidence, request.user!.id);
      compliance.evidence = [...(compliance.evidence || []), ...newEv];
    }
    if (typeof body.notes === "string") {
      compliance.notes = body.notes.trim();
    }

    await compliance.save();
    await recordAudit(request, "compliance" as never, compliance.id, "updated", before, compliance.toObject());

    response.json(compliance);
  } catch (error) {
    response.status(400).json({ message: asErrorMessage(error) });
  }
}
