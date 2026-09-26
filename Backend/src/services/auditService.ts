import crypto from "crypto";
import { Request } from "express";
import { AuditCategory, AuditEntityType, AuditLog } from "../models/AuditLog";

export function deriveAuditCategory(action: string): AuditCategory {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("insert") || lower.includes("upload")) {
    return "CREATION";
  }
  if (lower.includes("approve") || lower.includes("verify") || lower.includes("review") || lower.includes("inquire")) {
    return "APPROVAL";
  }
  if (
    lower.includes("status") ||
    lower.includes("resolve") ||
    lower.includes("close") ||
    lower.includes("suspend") ||
    lower.includes("activate")
  ) {
    return "STATUS_CHANGE";
  }
  if (lower.includes("update") || lower.includes("edit") || lower.includes("modify") || lower.includes("patch")) {
    return "MODIFICATION";
  }
  return "USER_ACTIVITY";
}

export async function recordAudit(
  request: Request & { user?: { id: string } },
  entityType: AuditEntityType,
  entityId: string,
  action: string,
  before?: unknown,
  after?: unknown,
  explicitCategory?: AuditCategory,
  details?: string
): Promise<void> {
  const actorId = request.user?.id;
  if (!actorId) return;

  const category = explicitCategory || deriveAuditCategory(action);
  const occurredAt = new Date();
  const ipAddress = request.ip || request.socket?.remoteAddress || "127.0.0.1";
  const requestId = request.header("X-Request-Id");

  // Fetch previous block hash in the immutable audit chain
  const latestLog = await AuditLog.findOne({}).sort({ occurredAt: -1, _id: -1 }).select("hash").lean();
  const previousHash =
    latestLog?.hash || "GENESIS_COAL_INDIA_DGMS_LEDGER_00000000000000000000000000000000";

  // Compute SHA-256 block hash for tamper-evident verification
  const payloadToHash = `${previousHash}|${actorId}|${entityType}|${entityId}|${action}|${category}|${occurredAt.toISOString()}|${JSON.stringify(
    before ?? ""
  )}|${JSON.stringify(after ?? "")}`;

  const hash = crypto.createHash("sha256").update(payloadToHash).digest("hex");

  await AuditLog.create({
    actorId,
    entityType,
    entityId,
    action,
    category,
    previousHash,
    hash,
    ipAddress,
    details: details || `${action.toUpperCase()} on ${entityType} [${entityId}]`,
    before,
    after,
    occurredAt,
    requestId
  });
}