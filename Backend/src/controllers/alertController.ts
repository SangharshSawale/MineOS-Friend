import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Alert } from "../models/Alert";
import { markAlertAsRead, syncOverdueAlerts } from "../services/alertService";
import { validId } from "../services/workflowService";

export async function listAlerts(request: AuthenticatedRequest, response: Response): Promise<void> {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);

  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.severity) filter.severity = request.query.severity;
  if (request.query.type) filter.type = request.query.type;
  if (request.query.isRead !== undefined) filter.isRead = request.query.isRead === "true";

  const [data, total] = await Promise.all([
    Alert.find(filter)
      .populate("mineId", "name code location")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Alert.countDocuments(filter)
  ]);

  response.json({ data, total, page, limit });
}

export async function getRecentAlerts(request: AuthenticatedRequest, response: Response): Promise<void> {
  await syncOverdueAlerts();
  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;

  const data = await Alert.find(filter)
    .populate("mineId", "name code")
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  response.json({ data });
}

export async function setAlertRead(request: AuthenticatedRequest, response: Response): Promise<void> {
  if (!validId(request.params.id)) {
    response.status(404).json({ message: "Alert not found" });
    return;
  }

  const alert = await markAlertAsRead(request.params.id);
  if (!alert) {
    response.status(404).json({ message: "Alert not found" });
    return;
  }

  response.json(alert);
}
