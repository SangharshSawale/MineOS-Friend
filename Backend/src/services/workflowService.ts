import { isValidObjectId } from "mongoose";
import { ActionStatus } from "../models/CorrectiveAction";
import { InspectionStatus } from "../models/Inspection";
import { ViolationStatus } from "../models/Violation";

export function validId(value: unknown): value is string {
  return typeof value === "string" && isValidObjectId(value);
}

export function requiredString(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${field} is required and must be at most ${maxLength} characters`);
  }
  return value.trim();
}

export function parseDate(value: unknown, field: string): Date {
  const date = new Date(String(value));
  if (!value || Number.isNaN(date.getTime())) throw new Error(`${field} must be a valid date`);
  return date;
}

export function assertTransition<T extends string>(current: T, next: T, allowed: Record<T, T[]>, field: string): void {
  if (current !== next && !allowed[current].includes(next)) throw new Error(`Invalid ${field} transition from ${current} to ${next}`);
}

export const inspectionTransitions: Record<InspectionStatus, InspectionStatus[]> = {
  draft: ["in_progress", "completed"],
  in_progress: ["completed", "follow_up_required"],
  completed: ["follow_up_required"],
  follow_up_required: ["completed"]
};

export const violationTransitions: Record<ViolationStatus, ViolationStatus[]> = {
  open: ["under_review", "resolved"],
  under_review: ["resolved"],
  resolved: []
};

export const actionTransitions: Record<ActionStatus, ActionStatus[]> = {
  open: ["assigned", "in_progress", "overdue"],
  assigned: ["in_progress", "overdue"],
  in_progress: ["evidence_submitted", "completed", "overdue"],
  evidence_submitted: ["verified", "in_progress"],
  completed: ["verified", "in_progress"],
  verified: ["approved", "evidence_submitted"],
  overdue: ["in_progress", "evidence_submitted", "completed"],
  approved: []
};

export function effectiveActionStatus(status: ActionStatus, deadline: Date): ActionStatus {
  if (status !== "evidence_submitted" && status !== "completed" && status !== "verified" && status !== "approved" && deadline.getTime() < Date.now()) return "overdue";
  return status;
}

export function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Invalid workflow data";
}