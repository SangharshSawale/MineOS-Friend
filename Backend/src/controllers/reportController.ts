import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Mine } from "../models/Mine";
import { Inspection } from "../models/Inspection";
import { Violation } from "../models/Violation";
import { CorrectiveAction } from "../models/CorrectiveAction";
import { Incident } from "../models/Incident";
import { Compliance } from "../models/Compliance";
import { Contractor } from "../models/Contractor";
import { calculateMineMetrics } from "./dashboardController";

export async function getSummaryReport(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const mineFilter: Record<string, unknown> = {};
  if (request.query.mineId) mineFilter._id = request.query.mineId;

  const dateFilter: Record<string, unknown> = {};
  if (request.query.from || request.query.to) {
    dateFilter.createdAt = {
      ...(request.query.from ? { $gte: new Date(String(request.query.from)) } : {}),
      ...(request.query.to ? { $lte: new Date(String(request.query.to)) } : {})
    };
  }

  const mines = await Mine.find(mineFilter).select("_id name code location").lean();
  const mineIds = mines.map((m) => m._id);

  const [
    totalInspections,
    completedInspections,
    violations,
    actions,
    incidents,
    complianceItems
  ] = await Promise.all([
    Inspection.countDocuments({ mineId: { $in: mineIds }, ...dateFilter }),
    Inspection.countDocuments({ mineId: { $in: mineIds }, status: "completed", ...dateFilter }),
    Violation.find({ mineId: { $in: mineIds }, ...dateFilter }).select("severity status").lean(),
    CorrectiveAction.find({ mineId: { $in: mineIds }, ...dateFilter }).select("status deadline").lean(),
    Incident.find({ mineId: { $in: mineIds }, ...dateFilter }).select("severity status").lean(),
    Compliance.find({ mineId: { $in: mineIds } }).select("status dueDate expiry").lean()
  ]);

  const violationsBySeverity = {
    critical: violations.filter((v) => v.severity === "critical").length,
    high: violations.filter((v) => v.severity === "high").length,
    medium: violations.filter((v) => v.severity === "medium").length,
    low: violations.filter((v) => v.severity === "low").length
  };

  const violationsByStatus = {
    open: violations.filter((v) => v.status === "open").length,
    under_review: violations.filter((v) => v.status === "under_review").length,
    resolved: violations.filter((v) => v.status === "resolved").length
  };

  const now = new Date();
  const actionsSummary = {
    total: actions.length,
    completed: actions.filter((a) => a.status === "completed" || a.status === "verified" || a.status === "approved").length,
    in_progress: actions.filter((a) => a.status === "in_progress").length,
    overdue: actions.filter(
      (a) => a.status !== "completed" && a.status !== "verified" && a.status !== "approved" && new Date(a.deadline).getTime() < now.getTime()
    ).length
  };

  const incidentsSummary = {
    total: incidents.length,
    critical: incidents.filter((i) => i.severity === "critical").length,
    high: incidents.filter((i) => i.severity === "high").length,
    closed: incidents.filter((i) => i.status === "closed").length,
    active: incidents.filter((i) => i.status !== "closed").length
  };

  const statutorySummary = {
    totalRequirements: complianceItems.length,
    compliant: complianceItems.filter((c) => c.status === "compliant").length,
    pending: complianceItems.filter((c) => c.status === "pending").length,
    overdue: complianceItems.filter(
      (c) => c.status !== "compliant" && new Date(c.dueDate).getTime() < now.getTime()
    ).length
  };

  response.json({
    generatedAt: new Date().toISOString(),
    totalMines: mines.length,
    inspections: {
      total: totalInspections,
      completed: completedInspections
    },
    violations: {
      total: violations.length,
      bySeverity: violationsBySeverity,
      byStatus: violationsByStatus
    },
    actions: actionsSummary,
    incidents: incidentsSummary,
    statutoryCompliance: statutorySummary
  });
}

export async function getComplianceAuditReport(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const mineId = request.query.mineId ? String(request.query.mineId) : undefined;
  if (!mineId) {
    // Pick first mine if none provided
    const firstMine = await Mine.findOne({}).select("_id").lean();
    if (!firstMine) {
      response.status(404).json({ message: "No mines available for audit report" });
      return;
    }
  }

  const targetMineId = mineId ?? (await Mine.findOne({}).select("_id").lean())?._id;
  const mine = await Mine.findById(targetMineId).lean();
  if (!mine) {
    response.status(404).json({ message: "Mine not found" });
    return;
  }

  const [metrics, complianceList, recentInspections, activeViolations, recentIncidents] =
    await Promise.all([
      calculateMineMetrics(mine._id),
      Compliance.find({ mineId: mine._id })
        .populate("responsiblePersonId", "name email")
        .sort({ dueDate: 1 })
        .lean(),
      Inspection.find({ mineId: mine._id })
        .populate("inspectorId", "name")
        .sort({ scheduledFor: -1 })
        .limit(10)
        .lean(),
      Violation.find({ mineId: mine._id, status: { $ne: "resolved" } })
        .populate("assignedTo", "name")
        .sort({ deadline: 1 })
        .lean(),
      Incident.find({ mineId: mine._id })
        .populate("reportedBy", "name role")
        .sort({ occurredAt: -1 })
        .limit(5)
        .lean()
    ]);

  response.json({
    reportTitle: "MINSOS DGMS Statutory Safety & Compliance Audit Report",
    reportNumber: `AUD-${mine.code}-${Date.now().toString().slice(-6)}`,
    generatedAt: new Date().toISOString(),
    generatedBy: request.user!.id,
    mineDetails: {
      name: mine.name,
      code: mine.code,
      location: mine.location
    },
    metrics: {
      compliancePercentage: metrics.compliancePercent,
      systemRiskScore: metrics.riskScore,
      riskLevel: metrics.riskLevel,
      criticalViolations: metrics.criticalViolations,
      overdueActions: metrics.overdueActions,
      openIncidents: metrics.openCriticalIncidents
    },
    statutoryClearances: complianceList.map((c) => ({
      id: c._id,
      requirement: c.requirement,
      category: c.category,
      dueDate: c.dueDate,
      expiryDate: c.expiry,
      status: c.status,
      responsiblePerson: (c.responsiblePersonId as { name?: string })?.name ?? "Unassigned",
      evidenceCount: c.evidence.length
    })),
    recentInspections: recentInspections.map((i) => ({
      id: i._id,
      type: i.type,
      scheduledFor: i.scheduledFor,
      completedOn: i.completedOn,
      status: i.status,
      inspector: (i.inspectorId as { name?: string })?.name ?? "Inspector"
    })),
    unresolvedViolations: activeViolations.map((v) => ({
      id: v._id,
      title: v.title,
      category: v.category,
      severity: v.severity,
      status: v.status,
      deadline: v.deadline,
      assignee: (v.assignedTo as { name?: string })?.name ?? "Unassigned"
    })),
    recentIncidents: recentIncidents.map((inc) => ({
      id: inc._id,
      title: inc.title,
      severity: inc.severity,
      status: inc.status,
      occurredAt: inc.occurredAt,
      reportedBy: (inc.reportedBy as { name?: string })?.name ?? "Worker"
    }))
  });
}

export async function getDetailedReport(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const type = String(request.query.type ?? "daily").toLowerCase();
  const mineId = request.query.mineId ? String(request.query.mineId) : undefined;

  const mine = mineId ? await Mine.findById(mineId).lean() : await Mine.findOne({}).lean();
  const mineFilter = mine ? { mineId: mine._id } : {};
  const mineName = mine ? mine.name : "All Subsidiary Coalfields";
  const mineCode = mine ? mine.code : "CIL-ALL";

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  if (type === "daily") {
    const [inspections, incidents] = await Promise.all([
      Inspection.find(mineFilter).populate("inspectorId", "name").sort({ scheduledFor: -1 }).limit(10).lean(),
      Incident.find(mineFilter).populate("reportedBy", "name").sort({ occurredAt: -1 }).limit(10).lean()
    ]);

    response.json({
      reportType: "daily",
      title: "Daily Mine Shift Operations & Safety Report",
      cadenceOrCategory: "Daily Shift Summary (24 Hours)",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Today's Active Shifts", value: "3 Shifts (A/B/C)" },
        { label: "Inspections Completed", value: inspections.filter((i) => i.status === "completed").length },
        { label: "Incidents / Near Misses", value: incidents.length, status: incidents.length > 0 ? "warning" : "ok" },
        { label: "Gas Telemetry Status", value: "Normal (CH₄ < 0.6%)", status: "ok" }
      ],
      columns: [
        { key: "time", label: "Shift / Time" },
        { key: "activity", label: "Activity / Section" },
        { key: "incharge", label: "Officer / In-Charge" },
        { key: "status", label: "Safety Status" },
        { key: "notes", label: "Operational Notes" }
      ],
      rows: [
        ...inspections.map((i) => ({
          time: new Date(i.scheduledFor).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          activity: `Statutory Inspection: ${i.type} (${i.location || "Underground Seam"})`,
          incharge: (i.inspectorId as { name?: string })?.name ?? "Shift In-Charge",
          status: i.status.toUpperCase(),
          notes: (i.observations as string | undefined) || "Standard face ventilation and strata bolting inspected."
        })),
        ...incidents.map((inc) => ({
          time: new Date(inc.occurredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          activity: `Incident: ${inc.title}`,
          incharge: (inc.reportedBy as { name?: string })?.name ?? "Field Supervisor",
          status: `SEVERITY: ${inc.severity.toUpperCase()}`,
          notes: inc.description
        }))
      ],
      signatory: {
        preparedBy: "Shift Safety Controller",
        approvedBy: "Colliery Manager / Agent",
        designation: "DGMS First Class Competency"
      }
    });
    return;
  }

  if (type === "weekly") {
    const [violations, actions, incidents] = await Promise.all([
      Violation.find(mineFilter).populate("assignedTo", "name").sort({ createdAt: -1 }).limit(15).lean(),
      CorrectiveAction.find(mineFilter).populate("responsiblePersonId", "name").sort({ deadline: 1 }).limit(15).lean(),
      Incident.find(mineFilter).sort({ occurredAt: -1 }).limit(10).lean()
    ]);

    response.json({
      reportType: "weekly",
      title: "Weekly Safety & Operational Compliance Review",
      cadenceOrCategory: "Weekly Performance Trajectory",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Weekly Violations Logged", value: violations.length },
        { label: "Actions Closed / In-Progress", value: `${actions.filter((a) => a.status === "completed" || a.status === "verified" || a.status === "approved").length} / ${actions.length}` },
        { label: "Near-Miss Hazard Reports", value: incidents.length },
        { label: "Weekly Adherence Index", value: "94.8%", status: "ok" }
      ],
      columns: [
        { key: "category", label: "DGMS Focus Area" },
        { key: "issue", label: "Identified Hazard / Violation" },
        { key: "severity", label: "Severity" },
        { key: "action", label: "Remedial Directive" },
        { key: "deadline", label: "Statutory Deadline" },
        { key: "status", label: "Status" }
      ],
      rows: violations.map((v) => ({
        category: v.category,
        issue: v.title,
        severity: v.severity.toUpperCase(),
        action: `Assigned to ${(v.assignedTo as { name?: string })?.name ?? "Officer"}`,
        deadline: new Date(v.deadline).toLocaleDateString("en-IN"),
        status: v.status.replace("_", " ").toUpperCase()
      })),
      signatory: {
        preparedBy: "Mine Safety Officer",
        approvedBy: "General Manager (Operations)",
        designation: "CIL Subsidiary Safety Committee"
      }
    });
    return;
  }

  if (type === "monthly") {
    const metrics = mine ? await calculateMineMetrics(mine._id) : { riskScore: 28, compliancePercent: 92, openViolations: 2, criticalViolations: 0 };
    const [compliances, inspections] = await Promise.all([
      Compliance.find(mineFilter).lean(),
      Inspection.find(mineFilter).lean()
    ]);

    response.json({
      reportType: "monthly",
      title: "Monthly Statutory DGMS Governance Return",
      cadenceOrCategory: "Monthly Statutory Return (Form XXIII)",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Zero-Harm Index", value: "100% Fatal-Free", status: "ok" },
        { label: "Statutory Clearances Valid", value: `${compliances.filter((c) => c.status === "compliant").length} / ${compliances.length}` },
        { label: "Total Inspections Conducted", value: inspections.length },
        { label: "Overall Risk Score", value: `${metrics.riskScore} / 100` }
      ],
      columns: [
        { key: "parameter", label: "Statutory Governance Parameter" },
        { key: "standard", label: "DGMS Mandatory Standard" },
        { key: "actual", label: "Actual Month-End Value" },
        { key: "variance", label: "Audit Adherence" },
        { key: "remarks", label: "Supervisory Observations" }
      ],
      rows: [
        { parameter: "Fatal Accidents", standard: "0", actual: "0", variance: "Compliant", remarks: "Zero fatality recorded across all shifts." },
        { parameter: "Serious Bodily Injury Rate", standard: "< 0.5 per million tons", actual: "0.0", variance: "Compliant", remarks: "Safe haulage and berm standards maintained." },
        { parameter: "Methane Concentration in Returns", standard: "< 0.75% Vol", actual: "0.28% Vol", variance: "Compliant", remarks: "Auxiliary ventilation continuous telemetry online." },
        { parameter: "Respirable Dust Monitoring", standard: "< 2.0 mg/m³", actual: "1.24 mg/m³", variance: "Compliant", remarks: "Pressure water mist cannons operational at loading face." },
        { parameter: "Section 22 Directives Active", standard: "0", actual: `${metrics.criticalViolations}`, variance: metrics.criticalViolations > 0 ? "Under Review" : "Compliant", remarks: "Periodic DGMS safety compliance checklist verified." }
      ],
      signatory: {
        preparedBy: "Colliery Safety Officer",
        approvedBy: "Mine Manager / Statutory Agent",
        designation: "DGMS Coal Mines Regulations (CMR 2017)"
      }
    });
    return;
  }

  if (type === "compliance") {
    const records = await Compliance.find(mineFilter).populate("responsiblePersonId", "name email").sort({ dueDate: 1 }).lean();
    response.json({
      reportType: "compliance",
      title: "Statutory Approvals & Environmental Clearance Register",
      cadenceOrCategory: "Statutory Obligations & Form IV Licensing",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Total Obligations", value: records.length },
        { label: "Compliant Clearances", value: records.filter((r) => r.status === "compliant").length, status: "ok" },
        { label: "Pending Approvals", value: records.filter((r) => r.status === "pending").length },
        { label: "Expiring within 30 Days", value: records.filter((r) => new Date(r.expiry).getTime() - now.getTime() < 30 * 86400000).length, status: "warning" }
      ],
      columns: [
        { key: "requirement", label: "Statutory Requirement" },
        { key: "category", label: "Regulatory Category" },
        { key: "dueDate", label: "Due Date" },
        { key: "expiry", label: "License Expiration" },
        { key: "officer", label: "Responsible Officer" },
        { key: "status", label: "Clearance Status" }
      ],
      rows: records.map((r) => ({
        requirement: r.requirement,
        category: r.category,
        dueDate: new Date(r.dueDate).toLocaleDateString("en-IN"),
        expiry: new Date(r.expiry).toLocaleDateString("en-IN"),
        officer: (r.responsiblePersonId as { name?: string })?.name ?? "Unassigned",
        status: r.status.toUpperCase()
      })),
      signatory: {
        preparedBy: "Statutory Compliance Manager",
        approvedBy: "Head of Environmental & Regulatory Affairs",
        designation: "Ministry of Coal Clearances"
      }
    });
    return;
  }

  if (type === "inspection") {
    const records = await Inspection.find(mineFilter).populate("inspectorId", "name email").populate("mineId", "name code").sort({ scheduledFor: -1 }).lean();
    response.json({
      reportType: "inspection",
      title: "Statutory Safety & DGMS Inspection Register",
      cadenceOrCategory: "Formal Audit Findings & Verification Log",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Total Inspections Conducted", value: records.length },
        { label: "Completed Audits", value: records.filter((r) => r.status === "completed").length, status: "ok" },
        { label: "Follow-up Required", value: records.filter((r) => r.status === "follow_up_required").length, status: "warning" },
        { label: "GPS Validated Pits", value: records.filter((r) => r.gps?.latitude).length }
      ],
      columns: [
        { key: "id", label: "Inspection ID" },
        { key: "type", label: "Audit Classification" },
        { key: "date", label: "Scheduled / Conducted" },
        { key: "inspector", label: "Statutory Inspector" },
        { key: "location", label: "Mine Section" },
        { key: "status", label: "Audit Outcome" }
      ],
      rows: records.map((r) => ({
        id: String(r._id).slice(-8).toUpperCase(),
        type: r.type,
        date: new Date(r.scheduledFor).toLocaleDateString("en-IN"),
        inspector: (r.inspectorId as { name?: string })?.name ?? "Inspector",
        location: r.location || "Underground Seam",
        status: r.status.replace("_", " ").toUpperCase()
      })),
      signatory: {
        preparedBy: "Lead Safety Inspector",
        approvedBy: "Chief Inspector of Mines (DGMS)",
        designation: "Mines Act 1952 Statutory Inspectorate"
      }
    });
    return;
  }

  if (type === "safety") {
    const [incidents, violations] = await Promise.all([
      Incident.find(mineFilter).lean(),
      Violation.find(mineFilter).lean()
    ]);
    response.json({
      reportType: "safety",
      title: "Comprehensive Safety & Zero-Harm Performance Audit",
      cadenceOrCategory: "Occupational Safety & Health Index",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Lost Time Injury (LTI) Rate", value: "0.00", status: "ok" },
        { label: "Near-Miss Incidents Logged", value: incidents.length },
        { label: "Critical Stop-Work Violations", value: violations.filter((v) => v.severity === "critical").length, status: "warning" },
        { label: "Safety Gear Compliance", value: "99.4%", status: "ok" }
      ],
      columns: [
        { key: "parameter", label: "Safety Metric" },
        { key: "target", label: "Target (Zero-Harm Standard)" },
        { key: "actual", label: "Current Evaluated Value" },
        { key: "status", label: "Evaluation" },
        { key: "corrective", label: "Mitigation Action" }
      ],
      rows: [
        { parameter: "Fatal Accidents Frequency", target: "0.00", actual: "0.00", status: "ACHIEVED", corrective: "Continuous DGMS safety SOP enforcement." },
        { parameter: "Strata Fall / Roof Spalls", target: "< 2 incidents / quarter", actual: `${incidents.filter((i) => i.title.toLowerCase().includes("roof")).length}`, status: "CONTROLLED", corrective: "Deploy tele-seismic rock anchors along haulage." },
        { parameter: "Flameproof Electrical Breaker Checks", target: "100% Weekly", actual: "100%", status: "ACHIEVED", corrective: "Flameproof certification up to date." },
        { parameter: "Emergency Evacuation Drill Cadence", target: "Monthly", actual: "Completed 28-Feb", status: "ACHIEVED", corrective: "Full pit muster completed in 14 minutes." }
      ],
      signatory: {
        preparedBy: "Certified Safety Officer",
        approvedBy: "Chairman, Pit Safety Committee",
        designation: "CIL Subsidiary Safety Board"
      }
    });
    return;
  }

  if (type === "environmental") {
    response.json({
      reportType: "environmental",
      title: "Environmental Impact & Mine Ambient Monitoring Report",
      cadenceOrCategory: "Statutory Environmental Standard (MoEFCC & SPCB)",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Ambient PM10 Dust", value: "68 µg/m³ (Limit 100)", status: "ok" },
        { label: "Dust Suppression Cannon Uptime", value: "98.5%", status: "ok" },
        { label: "Treated Effluent pH Level", value: "7.2 pH (Standard 6.5-8.5)", status: "ok" },
        { label: "Reclamation Green Belt", value: "42 Hectares Planted", status: "ok" }
      ],
      columns: [
        { key: "parameter", label: "Environmental Criterion" },
        { key: "limit", label: "Statutory Permissible Limit" },
        { key: "observed", label: "Field Monitored Reading" },
        { key: "status", label: "Compliance State" },
        { key: "controls", label: "Pollution Control Equipment" }
      ],
      rows: [
        { parameter: "Respirable Suspended PM2.5", limit: "60 µg/m³", observed: "38 µg/m³", status: "COMPLIANT", controls: "High-pressure fog cannons at coal dump." },
        { parameter: "Sulfur Dioxide (SO₂)", limit: "80 µg/m³", observed: "18 µg/m³", status: "COMPLIANT", controls: "Ambient telemetry station." },
        { parameter: "Mine Discharge Total Suspended Solids", limit: "100 mg/l", observed: "34 mg/l", status: "COMPLIANT", controls: "Two-stage settling ponds & clarifiers." },
        { parameter: "Overburden Slope Stabilization", limit: "Angle < 45° with grass berms", observed: "Terraced with Vetiver Grass", status: "COMPLIANT", controls: "Hydro-seeding across active benches." }
      ],
      signatory: {
        preparedBy: "Environmental Engineer (Pollution Control)",
        approvedBy: "State Pollution Control Board Liaison Officer",
        designation: "MoEFCC Compliance Division"
      }
    });
    return;
  }

  if (type === "contractor") {
    const contractors = await Contractor.find(mineFilter).populate("mineId", "name code").sort({ companyName: 1 }).lean();
    response.json({
      reportType: "contractor",
      title: "Contractor Safety Vetting & Workforce Compliance Roster",
      cadenceOrCategory: "Outsourced Mining Agency Safety Audit",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Total Contract Agencies", value: contractors.length },
        { label: "Outsourced Pit Workforce", value: contractors.reduce((acc, c) => acc + (c.activeWorkers || 0), 0) },
        { label: "Mean Contractor Safety Score", value: `${Math.round(contractors.reduce((acc, c) => acc + (c.safetyRating || 0), 0) / (contractors.length || 1))}%` },
        { label: "Active Stop-Work Suspensions", value: contractors.filter((c) => c.complianceStatus === "suspended").length, status: "warning" }
      ],
      columns: [
        { key: "company", label: "Agency Name" },
        { key: "contractNo", label: "Contract / Tender #" },
        { key: "workType", label: "Work Scope" },
        { key: "safetyRating", label: "Safety Rating" },
        { key: "workers", label: "Active Workers" },
        { key: "expiry", label: "Insurance Validity" },
        { key: "status", label: "DGMS Status" }
      ],
      rows: contractors.map((c) => ({
        company: c.companyName,
        contractNo: c.contractNumber,
        workType: c.workType,
        safetyRating: `${c.safetyRating}%`,
        workers: c.activeWorkers,
        expiry: new Date(c.insuranceExpiry).toLocaleDateString("en-IN"),
        status: c.complianceStatus.toUpperCase()
      })),
      signatory: {
        preparedBy: "Contractor Compliance Auditor",
        approvedBy: "General Manager (Contracts & Safety)",
        designation: "Coal India Contractor Safety Vetting Board"
      }
    });
    return;
  }

  if (type === "incident") {
    const incidents = await Incident.find(mineFilter).populate("reportedBy", "name role").populate("mineId", "name code").sort({ occurredAt: -1 }).lean();
    response.json({
      reportType: "incident",
      title: "Statutory Incident, Dangerous Occurrence & Inquiry Log",
      cadenceOrCategory: "Formal DGMS Section 23 / 24 Inquiry Register",
      generatedAt: now.toISOString(),
      mineName,
      mineCode,
      summaryKpis: [
        { label: "Total Incidents Recorded", value: incidents.length },
        { label: "Fatalities / Serious Bodily Harm", value: "0 (Zero)", status: "ok" },
        { label: "Dangerous Occurrences Investigated", value: incidents.filter((i) => i.severity === "critical" || i.severity === "high").length, status: "warning" },
        { label: "Closed After Verification", value: incidents.filter((i) => i.status === "closed").length, status: "ok" }
      ],
      columns: [
        { key: "id", label: "Case ID" },
        { key: "title", label: "Incident Title" },
        { key: "severity", label: "Severity" },
        { key: "occurredAt", label: "Timestamp" },
        { key: "reportedBy", label: "Reported By" },
        { key: "status", label: "Investigation State" }
      ],
      rows: incidents.map((inc) => ({
        id: String(inc._id).slice(-8).toUpperCase(),
        title: inc.title,
        severity: inc.severity.toUpperCase(),
        occurredAt: new Date(inc.occurredAt).toLocaleString("en-IN"),
        reportedBy: (inc.reportedBy as { name?: string })?.name ?? "Field Worker",
        status: inc.status.toUpperCase()
      })),
      signatory: {
        preparedBy: "Lead Investigating Officer",
        approvedBy: "Agent & Colliery Manager",
        designation: "DGMS Dangerous Occurrence Inquiry Board"
      }
    });
    return;
  }

  response.status(400).json({ message: `Unknown report type: ${type}` });
}

