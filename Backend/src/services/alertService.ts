import { Alert, AlertSeverity, AlertType, IAlert, RelatedEntityType } from "../models/Alert";
import { CorrectiveAction } from "../models/CorrectiveAction";
import { Inspection } from "../models/Inspection";
import { Compliance } from "../models/Compliance";

export interface CreateAlertInput {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  mineId: string | unknown;
  relatedEntityId?: string | unknown;
  relatedEntityType?: RelatedEntityType;
}

export async function createAlert(input: CreateAlertInput): Promise<IAlert> {
  // Deduplicate open alerts for the same entity and type
  if (input.relatedEntityId) {
    const existing = await Alert.findOne({
      relatedEntityId: input.relatedEntityId,
      type: input.type,
      resolvedAt: { $exists: false }
    });
    if (existing) {
      return existing;
    }
  }

  return Alert.create({
    type: input.type,
    severity: input.severity,
    title: input.title,
    message: input.message,
    mineId: input.mineId,
    relatedEntityId: input.relatedEntityId,
    relatedEntityType: input.relatedEntityType,
    isRead: false
  });
}

export async function markAlertAsRead(alertId: string): Promise<IAlert | null> {
  return Alert.findByIdAndUpdate(alertId, { isRead: true }, { new: true });
}

export async function resolveAlertByEntity(relatedEntityId: string): Promise<void> {
  await Alert.updateMany(
    { relatedEntityId, resolvedAt: { $exists: false } },
    { resolvedAt: new Date(), isRead: true }
  );
}

export async function checkHighRiskMine(mineId: unknown, mineName: string, riskScore: number): Promise<void> {
  if (riskScore >= 50) {
    const severity: AlertSeverity = riskScore >= 75 ? "critical" : "high";
    await createAlert({
      type: "high_risk_mine",
      severity,
      title: `High Risk Warning: ${mineName} (Score: ${riskScore})`,
      message: `Operational risk score for ${mineName} has escalated to ${riskScore}/100. Immediate statutory review recommended.`,
      mineId,
      relatedEntityId: mineId,
      relatedEntityType: "mine"
    });
  }
}

export async function checkUpcomingDeadlines(): Promise<void> {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 3600 * 1000);

  // 1. Actions due within 48h
  const upcomingActions = await CorrectiveAction.find({
    status: { $nin: ["completed", "verified"] },
    deadline: { $gte: now, $lte: in48Hours }
  }).populate("mineId", "name").lean();

  for (const action of upcomingActions) {
    const mineName = (action.mineId as { name?: string })?.name ?? "Mine";
    await createAlert({
      type: "upcoming_deadline",
      severity: "medium",
      title: `Deadline in <48h: ${action.title}`,
      message: `Action '${action.title}' at ${mineName} is due soon on ${new Date(action.deadline).toLocaleDateString()}`,
      mineId: (action.mineId as { _id?: unknown })?._id ?? action.mineId,
      relatedEntityId: action._id,
      relatedEntityType: "corrective_action"
    });
  }

  // 2. Compliance requirements due within 48h
  const upcomingCompliance = await Compliance.find({
    status: { $in: ["pending", "under_review"] },
    dueDate: { $gte: now, $lte: in48Hours }
  }).populate("mineId", "name").lean();

  for (const req of upcomingCompliance) {
    const mineName = (req.mineId as { name?: string })?.name ?? "Mine";
    await createAlert({
      type: "upcoming_deadline",
      severity: "high",
      title: `Statutory Due Soon: ${req.requirement}`,
      message: `Compliance obligation '${req.requirement}' at ${mineName} is due on ${new Date(req.dueDate).toLocaleDateString()}`,
      mineId: (req.mineId as { _id?: unknown })?._id ?? req.mineId,
      relatedEntityId: req._id,
      relatedEntityType: "compliance"
    });
  }
}

export async function syncOverdueAlerts(): Promise<void> {
  const now = new Date();

  // 1. Overdue corrective actions
  const overdueActions = await CorrectiveAction.find({
    status: { $nin: ["completed", "verified"] },
    deadline: { $lt: now }
  }).populate("mineId", "name").lean();

  for (const action of overdueActions) {
    const mineName = (action.mineId as { name?: string })?.name ?? "Mine";
    await createAlert({
      type: "overdue_action",
      severity: "high",
      title: `Overdue Action: ${action.title}`,
      message: `Action '${action.title}' at ${mineName} was due on ${new Date(action.deadline).toLocaleDateString()}`,
      mineId: (action.mineId as { _id?: unknown })?._id ?? action.mineId,
      relatedEntityId: action._id,
      relatedEntityType: "corrective_action"
    });
  }

  // 2. Overdue inspections
  const overdueInspections = await Inspection.find({
    status: { $in: ["draft", "in_progress"] },
    scheduledFor: { $lt: now }
  }).populate("mineId", "name").lean();

  for (const insp of overdueInspections) {
    const mineName = (insp.mineId as { name?: string })?.name ?? "Mine";
    await createAlert({
      type: "overdue_inspection",
      severity: "medium",
      title: `Overdue Inspection: ${insp.type}`,
      message: `Inspection '${insp.type}' at ${mineName} was scheduled for ${new Date(insp.scheduledFor).toLocaleDateString()}`,
      mineId: (insp.mineId as { _id?: unknown })?._id ?? insp.mineId,
      relatedEntityId: insp._id,
      relatedEntityType: "inspection"
    });
  }

  // 3. Overdue compliance requirements
  const overdueCompliance = await Compliance.find({
    status: { $in: ["pending", "under_review"] },
    dueDate: { $lt: now }
  }).populate("mineId", "name").lean();

  for (const req of overdueCompliance) {
    const mineName = (req.mineId as { name?: string })?.name ?? "Mine";
    await createAlert({
      type: "overdue_action",
      severity: "high",
      title: `Overdue Compliance: ${req.requirement}`,
      message: `Statutory requirement '${req.requirement}' at ${mineName} passed deadline (${new Date(req.dueDate).toLocaleDateString()})`,
      mineId: (req.mineId as { _id?: unknown })?._id ?? req.mineId,
      relatedEntityId: req._id,
      relatedEntityType: "compliance"
    });
  }

  // 4. Upcoming deadline check
  await checkUpcomingDeadlines();
}
