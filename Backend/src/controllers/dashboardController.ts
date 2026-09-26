import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Mine } from "../models/Mine";
import { Inspection } from "../models/Inspection";
import { Violation } from "../models/Violation";
import { CorrectiveAction } from "../models/CorrectiveAction";
import { Incident } from "../models/Incident";
import { checkHighRiskMine } from "../services/alertService";

export function getRiskLevel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export async function calculateMineMetrics(mineId: unknown) {
  const [completedInspections, criticalViolations, highViolations, mediumViolations, overdueActions, openCriticalIncidents, openViolationsCount] =
    await Promise.all([
      Inspection.find({ mineId, status: "completed" }).select("_id").lean(),
      Violation.countDocuments({ mineId, severity: "critical", status: { $ne: "resolved" } }),
      Violation.countDocuments({ mineId, severity: "high", status: { $ne: "resolved" } }),
      Violation.countDocuments({ mineId, severity: "medium", status: { $ne: "resolved" } }),
      CorrectiveAction.countDocuments({
        mineId,
        status: { $nin: ["completed", "verified"] },
        deadline: { $lt: new Date() }
      }),
      Incident.countDocuments({
        mineId,
        severity: "critical",
        status: { $ne: "closed" }
      }),
      Violation.countDocuments({ mineId, status: { $ne: "resolved" } })
    ]);

  // Compliance: (completed inspections with 0 critical violations / total completed inspections) * 100
  let compliantCount = 0;
  if (completedInspections.length > 0) {
    const inspectionIds = completedInspections.map((i) => i._id);
    const criticalsPerInspection = await Violation.aggregate([
      { $match: { inspectionId: { $in: inspectionIds }, severity: "critical" } },
      { $group: { _id: "$inspectionId", count: { $sum: 1 } } }
    ]);
    const criticalInspectionIdSet = new Set(criticalsPerInspection.map((g) => String(g._id)));
    for (const insp of completedInspections) {
      if (!criticalInspectionIdSet.has(String(insp._id))) {
        compliantCount++;
      }
    }
  }

  const compliancePercent =
    completedInspections.length > 0
      ? Math.min(Math.round((compliantCount / completedInspections.length) * 1000) / 10, 100)
      : 0;

  // Risk score formula: (Critical * 10) + (High * 5) + (Medium * 2) + (Overdue Actions * 3) + (Open Critical Incidents * 8)
  const rawRiskScore =
    criticalViolations * 10 +
    highViolations * 5 +
    mediumViolations * 2 +
    overdueActions * 3 +
    openCriticalIncidents * 8;

  const riskScore = Math.min(rawRiskScore, 100);
  const riskLevel = getRiskLevel(riskScore);
  const openItems = openViolationsCount + overdueActions + openCriticalIncidents;

  return {
    compliancePercent,
    riskScore,
    riskLevel,
    criticalViolations,
    openViolations: openViolationsCount,
    overdueActions,
    openCriticalIncidents,
    openItems
  };
}

export async function getDashboardSummary(request: AuthenticatedRequest, response: Response): Promise<void> {
  const mineFilter = request.query.mineId ? { _id: request.query.mineId } : {};
  const mines = await Mine.find(mineFilter).select("_id").lean();
  const mineIds = mines.map((mine) => mine._id);

  const [
    completedInspections,
    openViolations,
    criticalViolations,
    highViolations,
    mediumViolations,
    overdueActions,
    openCriticalIncidents
  ] = await Promise.all([
    Inspection.find({ mineId: { $in: mineIds }, status: "completed" }).select("_id").lean(),
    Violation.countDocuments({ mineId: { $in: mineIds }, status: { $ne: "resolved" } }),
    Violation.countDocuments({ mineId: { $in: mineIds }, severity: "critical", status: { $ne: "resolved" } }),
    Violation.countDocuments({ mineId: { $in: mineIds }, severity: "high", status: { $ne: "resolved" } }),
    Violation.countDocuments({ mineId: { $in: mineIds }, severity: "medium", status: { $ne: "resolved" } }),
    CorrectiveAction.countDocuments({
      mineId: { $in: mineIds },
      status: { $nin: ["completed", "verified"] },
      deadline: { $lt: new Date() }
    }),
    Incident.countDocuments({
      mineId: { $in: mineIds },
      severity: "critical",
      status: { $ne: "closed" }
    })
  ]);

  let compliantCount = 0;
  if (completedInspections.length > 0) {
    const inspectionIds = completedInspections.map((i) => i._id);
    const criticalsPerInspection = await Violation.aggregate([
      { $match: { inspectionId: { $in: inspectionIds }, severity: "critical" } },
      { $group: { _id: "$inspectionId", count: { $sum: 1 } } }
    ]);
    const criticalSet = new Set(criticalsPerInspection.map((g) => String(g._id)));
    for (const insp of completedInspections) {
      if (!criticalSet.has(String(insp._id))) {
        compliantCount++;
      }
    }
  }

  const compliancePercent =
    completedInspections.length > 0
      ? Math.min(Math.round((compliantCount / completedInspections.length) * 1000) / 10, 100)
      : 0;

  const rawRiskScore =
    criticalViolations * 10 +
    highViolations * 5 +
    mediumViolations * 2 +
    overdueActions * 3 +
    openCriticalIncidents * 8;

  const riskScore = Math.min(rawRiskScore, 100);
  const riskLevel = getRiskLevel(riskScore);

  response.json({
    totalMines: mineIds.length,
    compliancePercent,
    openViolations,
    criticalViolations,
    overdueActions,
    riskScore,
    riskLevel,
    generatedAt: new Date().toISOString()
  });
}

export async function getMineRiskRanking(request: AuthenticatedRequest, response: Response): Promise<void> {
  const mines = await Mine.find({}).select("name code location").lean();

  const ranking = await Promise.all(
    mines.map(async (mine) => {
      const metrics = await calculateMineMetrics(mine._id);
      if (metrics.riskScore >= 50) {
        checkHighRiskMine(mine._id, mine.name, metrics.riskScore).catch(() => undefined);
      }
      return {
        id: mine._id,
        name: mine.name,
        code: mine.code,
        location: mine.location,
        compliance: metrics.compliancePercent,
        risk: metrics.riskLevel,
        riskScore: metrics.riskScore,
        openItems: metrics.openItems
      };
    })
  );

  // Sort by highest riskScore first
  ranking.sort((a, b) => b.riskScore - a.riskScore);

  response.json({ data: ranking });
}

export async function getRecentInspections(request: AuthenticatedRequest, response: Response): Promise<void> {
  const inspections = await Inspection.find({})
    .populate("mineId", "name code")
    .populate("inspectorId", "name")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const data = inspections.map((insp) => ({
    id: insp._id,
    mine: (insp.mineId as { name?: string })?.name ?? "Mine",
    type: insp.type,
    date: new Date(insp.scheduledFor).toLocaleDateString(),
    status: insp.status,
    inspector: (insp.inspectorId as { name?: string })?.name ?? "Inspector"
  }));

  response.json({ data });
}

export async function getOpenCorrectiveActions(request: AuthenticatedRequest, response: Response): Promise<void> {
  const actions = await CorrectiveAction.find({
    status: { $nin: ["completed", "verified"] }
  })
    .populate("mineId", "name code")
    .populate("responsiblePersonId", "name")
    .sort({ deadline: 1 })
    .limit(5)
    .lean();

  const now = new Date();
  const data = actions.map((act) => {
    const isOverdue = new Date(act.deadline).getTime() < now.getTime();
    return {
      id: act._id,
      action: act.title,
      mine: (act.mineId as { name?: string })?.name ?? "Mine",
      owner: (act.responsiblePersonId as { name?: string })?.name ?? "Assigned Staff",
      due: new Date(act.deadline).toLocaleDateString(),
      status: isOverdue ? "Overdue" : act.status === "in_progress" ? "In progress" : "Open"
    };
  });

  response.json({ data });
}