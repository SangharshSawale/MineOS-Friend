import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { ApprovalRequest } from "../models/ApprovalRequest";
import { recordAudit } from "../services/auditService";
import { Mine } from "../models/Mine";

export async function listApprovals(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (request.query.status) filter.status = request.query.status;
  if (request.query.mineId) filter.mineId = request.query.mineId;

  const data = await ApprovalRequest.find(filter)
    .populate("mineId", "name code")
    .populate("submittedBy", "name email role")
    .populate("reviewedBy", "name email role")
    .sort({ submittedAt: -1 })
    .lean();

  response.json({ data, total: data.length });
}

export async function createApproval(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const { title, category, mineId, urgency, notes, referenceEntityId } = request.body;

  let targetMineId = mineId;
  if (!targetMineId) {
    const defaultMine = await Mine.findOne({}).select("_id").lean();
    targetMineId = defaultMine?._id;
  }

  if (!title || !category) {
    response.status(400).json({ message: "Missing required approval attributes" });
    return;
  }

  const approval = await ApprovalRequest.create({
    title,
    category,
    mineId: targetMineId,
    submittedBy: request.user!.id,
    urgency: urgency || "normal",
    status: "pending",
    notes: notes || undefined,
    referenceEntityId: referenceEntityId || undefined,
    submittedAt: new Date()
  });

  await recordAudit(request, "corrective_action", String(approval._id), "create_approval_request", undefined, {
    title,
    category
  });

  response.status(201).json(approval);
}

export async function reviewApproval(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const { status, notes } = request.body;
  if (!status || !["approved", "rejected"].includes(status)) {
    response.status(400).json({ message: "Invalid approval decision. Must be approved or rejected" });
    return;
  }

  const approval = await ApprovalRequest.findById(request.params.id);
  if (!approval) {
    response.status(404).json({ message: "Approval request not found" });
    return;
  }

  const beforeStatus = approval.status;
  approval.status = status;
  approval.reviewedBy = request.user!.id as never;
  approval.reviewedAt = new Date();
  if (notes) approval.notes = notes;
  await approval.save();

  await recordAudit(
    request,
    "corrective_action",
    String(approval._id),
    status === "approved" ? "approve_request" : "reject_request",
    { status: beforeStatus },
    { status, reviewer: request.user!.id }
  );

  response.json(approval);
}
