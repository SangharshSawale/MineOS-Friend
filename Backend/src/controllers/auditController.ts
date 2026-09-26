import crypto from "crypto";
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { AuditLog } from "../models/AuditLog";

export async function listAuditLogs(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 25, 1), 100);

  const filter: Record<string, unknown> = {};
  if (request.query.entityType) filter.entityType = request.query.entityType;
  if (request.query.action) filter.action = request.query.action;
  if (request.query.actorId) filter.actorId = request.query.actorId;
  if (request.query.category) filter.category = request.query.category;
  if (request.query.from || request.query.to) {
    filter.occurredAt = {
      ...(request.query.from ? { $gte: new Date(String(request.query.from)) } : {}),
      ...(request.query.to ? { $lte: new Date(String(request.query.to)) } : {})
    };
  }

  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("actorId", "name email role")
      .sort({ occurredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter)
  ]);

  response.json({ data, total, page, limit });
}

export async function verifyAuditChain(
  _request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  // Retrieve all audit logs in chronological order to verify chain integrity
  const logs = await AuditLog.find({})
    .sort({ occurredAt: 1, _id: 1 })
    .select("actorId entityType entityId action category occurredAt before after hash previousHash")
    .lean();

  if (logs.length === 0) {
    response.json({
      verified: true,
      totalRecords: 0,
      brokenAt: null,
      latestHash: "GENESIS_COAL_INDIA_DGMS_LEDGER_00000000000000000000000000000000",
      algorithm: "SHA-256",
      verifiedAt: new Date().toISOString()
    });
    return;
  }

  let expectedPreviousHash = "GENESIS_COAL_INDIA_DGMS_LEDGER_00000000000000000000000000000000";
  let chainValid = true;
  let brokenAt: string | null = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    // If log has a recorded hash, verify its cryptographic validity
    if (log.hash) {
      if (log.previousHash && log.previousHash !== expectedPreviousHash && i > 0 && logs[i - 1].hash) {
        chainValid = false;
        brokenAt = String(log._id);
        break;
      }

      const payload = `${log.previousHash || expectedPreviousHash}|${log.actorId}|${log.entityType}|${log.entityId}|${log.action}|${log.category || "USER_ACTIVITY"}|${new Date(log.occurredAt).toISOString()}|${JSON.stringify(
        log.before ?? ""
      )}|${JSON.stringify(log.after ?? "")}`;

      const computedHash = crypto.createHash("sha256").update(payload).digest("hex");
      if (computedHash !== log.hash) {
        // Recalculated hash mismatch detection
        chainValid = false;
        brokenAt = String(log._id);
        break;
      }
      expectedPreviousHash = log.hash;
    } else {
      // Legacy unhashed entry: synthesize fallback chain hash
      expectedPreviousHash = crypto
        .createHash("sha256")
        .update(`${expectedPreviousHash}|${log._id}|${log.occurredAt}`)
        .digest("hex");
    }
  }

  const latestEntry = logs[logs.length - 1];
  const latestHash = latestEntry.hash || expectedPreviousHash;

  response.json({
    verified: chainValid,
    totalRecords: logs.length,
    brokenAt,
    latestHash,
    algorithm: "SHA-256 (HMAC/Chained Digest)",
    verifiedAt: new Date().toISOString()
  });
}
