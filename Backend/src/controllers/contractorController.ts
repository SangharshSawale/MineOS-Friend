import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Contractor, CONTRACTOR_STATUSES } from "../models/Contractor";
import { Mine } from "../models/Mine";
import { recordAudit } from "../services/auditService";
import { asErrorMessage, parseDate, validId } from "../services/workflowService";

export async function listContractors(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const page = Math.max(Number(request.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);

  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.complianceStatus) filter.complianceStatus = request.query.complianceStatus;

  const [data, total] = await Promise.all([
    Contractor.find(filter)
      .populate("mineId", "name code location")
      .sort({ companyName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Contractor.countDocuments(filter)
  ]);

  response.json({ data, total, page, limit });
}

export async function createContractor(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const body = request.body as Record<string, unknown>;

  if (
    !validId(body.mineId) ||
    typeof body.companyName !== "string" ||
    typeof body.contractNumber !== "string" ||
    typeof body.workType !== "string"
  ) {
    response.status(400).json({
      message: "mineId, companyName, contractNumber, and workType are required"
    });
    return;
  }

  try {
    if (!(await Mine.exists({ _id: body.mineId }))) {
      response.status(404).json({ message: "Mine not found" });
      return;
    }

    const insuranceExpiry = parseDate(
      body.insuranceExpiry ?? new Date(Date.now() + 180 * 86400000),
      "insuranceExpiry"
    );

    const contractor = await Contractor.create({
      companyName: body.companyName.trim(),
      contractNumber: body.contractNumber.trim().toUpperCase(),
      mineId: body.mineId,
      workType: body.workType.trim(),
      safetyRating: typeof body.safetyRating === "number" ? body.safetyRating : 85,
      activeWorkers: typeof body.activeWorkers === "number" ? body.activeWorkers : 10,
      complianceStatus: body.complianceStatus && CONTRACTOR_STATUSES.includes(body.complianceStatus as never)
        ? body.complianceStatus
        : "compliant",
      insuranceExpiry,
      contactName: typeof body.contactName === "string" ? body.contactName.trim() : "Contractor Contact",
      contactPhone: typeof body.contactPhone === "string" ? body.contactPhone.trim() : "N/A",
      contactEmail: typeof body.contactEmail === "string" ? body.contactEmail.trim().toLowerCase() : "contractor@example.com",
      createdBy: request.user!.id
    });

    await recordAudit(request, "contractor" as never, contractor.id, "created", undefined, contractor.toObject());
    response.status(201).json(contractor);
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 11000) {
      response.status(409).json({ message: "Contract number already registered" });
      return;
    }
    response.status(400).json({ message: asErrorMessage(error) });
  }
}

export async function updateContractor(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  if (!validId(request.params.id)) {
    response.status(404).json({ message: "Contractor not found" });
    return;
  }

  const contractor = await Contractor.findById(request.params.id);
  if (!contractor) {
    response.status(404).json({ message: "Contractor not found" });
    return;
  }

  const before = contractor.toObject();
  const body = request.body as Record<string, unknown>;

  try {
    for (const key of ["companyName", "workType", "contactName", "contactPhone", "contactEmail"] as const) {
      if (typeof body[key] === "string") {
        (contractor as unknown as Record<string, unknown>)[key] = (body[key] as string).trim();
      }
    }
    if (typeof body.safetyRating === "number") contractor.safetyRating = body.safetyRating;
    if (typeof body.activeWorkers === "number") contractor.activeWorkers = body.activeWorkers;
    if (body.complianceStatus && CONTRACTOR_STATUSES.includes(body.complianceStatus as never)) {
      contractor.complianceStatus = body.complianceStatus as typeof contractor.complianceStatus;
    }
    if (body.insuranceExpiry) {
      contractor.insuranceExpiry = parseDate(body.insuranceExpiry, "insuranceExpiry");
    }

    await contractor.save();
    await recordAudit(request, "contractor" as never, contractor.id, "updated", before, contractor.toObject());
    response.json(contractor);
  } catch (error) {
    response.status(400).json({ message: asErrorMessage(error) });
  }
}

export async function deleteContractor(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  if (!validId(request.params.id)) {
    response.status(404).json({ message: "Contractor not found" });
    return;
  }

  const contractor = await Contractor.findByIdAndDelete(request.params.id);
  if (!contractor) {
    response.status(404).json({ message: "Contractor not found" });
    return;
  }

  await recordAudit(request, "contractor" as never, contractor.id, "deleted", contractor.toObject(), undefined);
  response.status(204).send();
}
