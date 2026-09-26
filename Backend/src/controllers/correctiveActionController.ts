import { Response } from "express";
import { Schema } from "mongoose";
import { AuthenticatedRequest } from "../middleware/auth";
import { CorrectiveAction } from "../models/CorrectiveAction";
import { Violation } from "../models/Violation";
import { User } from "../models/User";
import { normaliseEvidence } from "../models/workflowTypes";
import { recordAudit } from "../services/auditService";
import { createAlert, resolveAlertByEntity } from "../services/alertService";
import { actionTransitions, asErrorMessage, assertTransition, effectiveActionStatus, parseDate, validId } from "../services/workflowService";

/**
 * POST /corrective-actions
 * Safety Officer / Mine Manager registers a corrective action and assigns to a worker.
 */
export async function createCorrectiveAction(request: AuthenticatedRequest, response: Response): Promise<void> {
  const body = request.body as Record<string, unknown>;
  if (!validId(body.violationId) || !validId(body.responsiblePersonId) || typeof body.title !== "string") {
    response.status(400).json({ message: "violationId, title and responsiblePersonId are required" });
    return;
  }
  try {
    const violation = await Violation.findById(body.violationId);
    if (!violation) { response.status(404).json({ message: "Violation not found" }); return; }

    if (request.user!.role === "inspector" && body.responsiblePersonId !== request.user!.id) {
      response.status(403).json({ message: "Inspectors may create only actions assigned to themselves" });
      return;
    }

    // Determine the worker assignment
    const assignedToId = validId(body.assignedTo) ? body.assignedTo : body.responsiblePersonId;
    const assignedUser = await User.findById(assignedToId);

    const action = await CorrectiveAction.create({
      violationId: violation.id,
      inspectionId: violation.inspectionId,
      mineId: violation.mineId,
      title: body.title,
      description: body.description,
      responsiblePersonId: body.responsiblePersonId,
      assignedTo: assignedToId,
      assignedAt: new Date(),
      deadline: parseDate(body.deadline, "deadline"),
      status: assignedUser ? "assigned" : "open",
      evidence: normaliseEvidence(body.evidence, request.user!.id),
      createdBy: request.user!.id
    });

    // Create alert for the assigned worker
    if (assignedUser) {
      await createAlert({
        type: "action_assigned",
        severity: "medium",
        title: `Corrective Action Assigned: ${action.title}`,
        message: `You have been assigned corrective action "${action.title}" at ${violation.title}. Deadline: ${action.deadline.toLocaleDateString()}.`,
        mineId: violation.mineId as unknown as string,
        relatedEntityId: action._id as unknown as string,
        relatedEntityType: "corrective_action"
      });
    }

    await recordAudit(request, "corrective_action", action.id, "created", undefined, action.toObject());
    response.status(201).json(action);
  } catch (error) {
    response.status(400).json({ message: asErrorMessage(error) });
  }
}

/**
 * GET /corrective-actions
 * List with population and effective status.
 */
export async function listCorrectiveActions(request: AuthenticatedRequest, response: Response): Promise<void> {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 50, 1), 100);
  const filter: Record<string, unknown> = {};

  for (const key of ["mineId", "violationId", "status", "responsiblePersonId", "assignedTo"]) {
    if (request.query[key]) filter[key] = request.query[key];
  }

  // Workers see only their assigned actions
  if (request.user!.role === "worker") {
    filter.assignedTo = request.user!.id;
  }

  const actions = await CorrectiveAction.find(filter)
    .populate("violationId", "title severity status")
    .populate("inspectionId", "type")
    .populate("responsiblePersonId", "name email role")
    .populate("assignedTo", "name email role")
    .populate("verification.verifiedBy", "name email role")
    .populate("approval.approvedBy", "name email role")
    .populate("createdBy", "name email role")
    .sort({ deadline: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const data = actions.map((item) => ({
    ...item,
    status: effectiveActionStatus(item.status, item.deadline),
    evidenceCount: item.evidence.length
  })).filter((item) => request.query.overdue === "true" ? item.status === "overdue" : true);

  response.json({ data, page, limit, total: await CorrectiveAction.countDocuments(filter) });
}

/**
 * PATCH /corrective-actions/:id
 * Generic update (reassign, change title/description/deadline).
 */
export async function updateCorrectiveAction(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) { response.status(404).json({ message: "Corrective action not found" }); return; }
  const action = await CorrectiveAction.findById(request.params.id);
  if (!action) { response.status(404).json({ message: "Corrective action not found" }); return; }

  // Workers can only update their own assigned actions
  if (
    (request.user!.role === "worker" || request.user!.role === "contractor") &&
    String(action.assignedTo ?? action.responsiblePersonId) !== request.user!.id
  ) {
    response.status(403).json({ message: "You may update only assigned actions" });
    return;
  }

  const before = action.toObject();
  const body = request.body as Record<string, unknown>;

  try {
    // Prevent direct status jumps to verified/approved via generic update
    if (body.status === "verified") throw new Error("Use the verification endpoint to verify an action");
    if (body.status === "approved") throw new Error("Use the approval endpoint to approve an action");

    if (body.status) {
      assertTransition(action.status, body.status as typeof action.status, actionTransitions, "action status");
    }

    for (const key of ["title", "description", "responsiblePersonId", "status"] as const) {
      if (key in body) (action as unknown as Record<string, unknown>)[key] = body[key];
    }

    if (body.deadline) action.deadline = parseDate(body.deadline, "deadline");

    // Handle worker assignment
    if (validId(body.assignedTo)) {
      action.assignedTo = body.assignedTo as unknown as Schema.Types.ObjectId;
      action.assignedAt = new Date();
      if (action.status === "open") action.status = "assigned";
    }

    // Handle status-specific timestamps
    if (body.status === "in_progress" && !action.completedAt) {
      // Worker started work
    }

    if ("evidence" in body && Array.isArray(body.evidence)) {
      const newEv = normaliseEvidence(body.evidence, request.user!.id);
      action.evidence = [...(action.evidence || []), ...newEv];
    }

    await action.save();
    await recordAudit(request, "corrective_action", action.id, "updated", before, action.toObject());
    response.json(action);
  } catch (error) {
    response.status(400).json({ message: asErrorMessage(error) });
  }
}

/**
 * PATCH /corrective-actions/:id/submit
 * Worker submits evidence and marks action as evidence_submitted.
 */
export async function submitActionEvidence(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) { response.status(404).json({ message: "Corrective action not found" }); return; }
  const action = await CorrectiveAction.findById(request.params.id);
  if (!action) { response.status(404).json({ message: "Corrective action not found" }); return; }

  // Workers can only submit their own assigned actions
  if (request.user!.role === "worker" && String(action.assignedTo ?? action.responsiblePersonId) !== request.user!.id) {
    response.status(403).json({ message: "You can only submit evidence for actions assigned to you" });
    return;
  }

  // Must be in_progress or overdue or assigned to submit
  if (!["in_progress", "overdue", "assigned"].includes(action.status)) {
    response.status(400).json({ message: `Cannot submit evidence from status '${action.status}'. Action must be in progress.` });
    return;
  }

  const before = action.toObject();
  const body = request.body as Record<string, unknown>;

  try {
    // Append evidence
    if ("evidence" in body && Array.isArray(body.evidence)) {
      const newEv = normaliseEvidence(body.evidence, request.user!.id);
      action.evidence = [...(action.evidence || []), ...newEv];
    }

    if (action.evidence.length === 0) {
      response.status(400).json({ message: "At least one evidence item (photo or report) must be attached to submit" });
      return;
    }

    action.status = "evidence_submitted";
    action.submittedAt = new Date();
    action.submissionNote = typeof body.note === "string" ? body.note.trim() : undefined;

    await action.save();

    // Alert safety officer that evidence was submitted
    await createAlert({
      type: "evidence_submitted",
      severity: "low",
      title: `Evidence Submitted: ${action.title}`,
      message: `Worker submitted evidence for corrective action "${action.title}". Awaiting safety officer verification.`,
      mineId: action.mineId as unknown as string,
      relatedEntityId: action._id as unknown as string,
      relatedEntityType: "corrective_action"
    });

    await recordAudit(request, "corrective_action", action.id, "evidence_submitted", before, action.toObject());
    response.json(action);
  } catch (error) {
    response.status(400).json({ message: asErrorMessage(error) });
  }
}

/**
 * PATCH /corrective-actions/:id/verify
 * Safety Officer verifies the evidence submitted by the worker.
 */
export async function verifyCorrectiveAction(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) { response.status(404).json({ message: "Corrective action not found" }); return; }
  const action = await CorrectiveAction.findById(request.params.id);
  if (!action) { response.status(404).json({ message: "Corrective action not found" }); return; }

  if (action.status !== "evidence_submitted") {
    response.status(400).json({ message: "Only actions with submitted evidence can be verified. Current status: " + action.status });
    return;
  }

  const before = action.toObject();
  action.status = "verified";
  action.verification = {
    verifiedBy: request.user!.id as unknown as Schema.Types.ObjectId,
    verifiedAt: new Date(),
    note: typeof request.body?.note === "string" ? request.body.note : undefined
  };

  await action.save();

  // Alert mine manager that action is verified and awaiting approval
  await createAlert({
    type: "action_verified",
    severity: "low",
    title: `Action Verified: ${action.title}`,
    message: `Safety officer verified corrective action "${action.title}". Awaiting mine manager approval for closure.`,
    mineId: action.mineId as unknown as string,
    relatedEntityId: action._id as unknown as string,
    relatedEntityType: "corrective_action"
  });

  await recordAudit(request, "corrective_action", action.id, "verified", before, action.toObject());
  response.json(action);
}

/**
 * PATCH /corrective-actions/:id/approve
 * Mine Manager gives final approval and closes the corrective action.
 */
export async function approveCorrectiveAction(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) { response.status(404).json({ message: "Corrective action not found" }); return; }
  const action = await CorrectiveAction.findById(request.params.id);
  if (!action) { response.status(404).json({ message: "Corrective action not found" }); return; }

  if (action.status !== "verified") {
    response.status(400).json({ message: "Only verified actions can be approved. Current status: " + action.status });
    return;
  }

  const before = action.toObject();
  action.status = "approved";
  action.completedAt = new Date();
  action.approval = {
    approvedBy: request.user!.id as unknown as Schema.Types.ObjectId,
    approvedAt: new Date(),
    note: typeof request.body?.note === "string" ? request.body.note : undefined
  };

  await action.save();
  await resolveAlertByEntity(action.id);

  // Check if all corrective actions for this violation are now approved
  const pending = await CorrectiveAction.exists({
    violationId: action.violationId,
    status: { $nin: ["approved"] }
  });
  if (!pending) {
    // All actions done — create summary alert
    await createAlert({
      type: "all_actions_completed",
      severity: "low",
      title: `All Corrective Actions Approved`,
      message: `All corrective actions for violation ${action.violationId} have been approved. The violation may now be resolved.`,
      mineId: action.mineId as unknown as string,
      relatedEntityId: action.violationId as unknown as string,
      relatedEntityType: "violation"
    });
  }

  await recordAudit(request, "corrective_action", action.id, "approved", before, action.toObject());
  response.json(action);
}

/**
 * PATCH /corrective-actions/:id/reject
 * Safety Officer or Mine Manager rejects the action back to in_progress.
 */
export async function rejectCorrectiveAction(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) { response.status(404).json({ message: "Corrective action not found" }); return; }
  const action = await CorrectiveAction.findById(request.params.id);
  if (!action) { response.status(404).json({ message: "Corrective action not found" }); return; }

  if (!["evidence_submitted", "verified"].includes(action.status)) {
    response.status(400).json({ message: "Only actions with submitted evidence or verified status can be rejected. Current: " + action.status });
    return;
  }

  const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "Insufficient evidence or does not meet standards.";

  const before = action.toObject();
  const fromStage = action.status;
  action.status = "in_progress";

  // Track rejection history
  if (!action.rejectionHistory) action.rejectionHistory = [];
  action.rejectionHistory.push({
    rejectedBy: request.user!.id as unknown as Schema.Types.ObjectId,
    rejectedAt: new Date(),
    reason,
    fromStage
  });

  // Clear verification if rejecting from verified stage
  if (fromStage === "verified") {
    action.verification = undefined;
  }

  await action.save();

  // Alert worker that their submission was rejected
  await createAlert({
    type: "action_rejected",
    severity: "medium",
    title: `Action Rejected: ${action.title}`,
    message: `Your corrective action submission was rejected. Reason: ${reason}. Please re-do the work and re-submit evidence.`,
    mineId: action.mineId as unknown as string,
    relatedEntityId: action._id as unknown as string,
    relatedEntityType: "corrective_action"
  });

  await recordAudit(request, "corrective_action", action.id, "rejected", before, action.toObject());
  response.json(action);
}