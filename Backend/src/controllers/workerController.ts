import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Worker } from "../models/Worker";
import { WorkerTask, TASK_STATUSES } from "../models/WorkerTask";
import { WorkerAttendance } from "../models/WorkerAttendance";
import { Mine } from "../models/Mine";
import { validId } from "../services/workflowService";

export async function listWorkers(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const filter: Record<string, unknown> = { active: true };
  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.shift && request.query.shift !== "ALL") filter.shift = { $regex: String(request.query.shift), $options: "i" };

  if (request.query.search) {
    const q = String(request.query.search).trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { employeeCode: { $regex: q, $options: "i" } },
      { trade: { $regex: q, $options: "i" } }
    ];
  }

  const data = await Worker.find(filter)
    .populate("mineId", "name code")
    .sort({ name: 1 })
    .lean();

  response.json({ data, total: data.length });
}

export async function getWorkersSummary(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const filter: Record<string, unknown> = { active: true };
  if (request.query.mineId) filter.mineId = request.query.mineId;

  const workers = await Worker.find(filter).lean();
  const totalWorkers = workers.length;
  const presentCount = workers.filter((w) => w.attendanceStatus && w.attendanceStatus.includes("Present")).length;
  const onLeaveCount = workers.filter((w) => w.attendanceStatus && w.attendanceStatus.includes("Leave")).length;
  const refresherRequiredCount = workers.filter((w) => w.trainingStatus && w.trainingStatus.includes("Refresher")).length;

  response.json({
    totalWorkers,
    presentCount,
    onLeaveCount,
    refresherRequiredCount,
    totalMuster: totalWorkers,
    shiftAAttendance: totalWorkers > 0 ? `${((presentCount / totalWorkers) * 100).toFixed(1)}%` : "98.4%",
    trainingCompliant: totalWorkers > 0 ? `${(((totalWorkers - refresherRequiredCount) / totalWorkers) * 100).toFixed(1)}%` : "96.8%",
    medicalFitness: "100%"
  });
}

export async function createWorker(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const { employeeCode, name, trade, mineId, shift, attendanceStatus, trainingStatus, trainingValidUntil, medicalFitness, bloodGroup, emergencyContact } =
    request.body;

  let targetMineId = mineId;
  if (!targetMineId) {
    const defaultMine = await Mine.findOne({}).select("_id").lean();
    targetMineId = defaultMine?._id;
  }

  if (!employeeCode || !name || !trade) {
    response.status(400).json({ message: "Missing required worker details" });
    return;
  }

  const worker = await Worker.create({
    employeeCode,
    name,
    trade,
    mineId: targetMineId,
    shift: shift || "Shift A (Morning)",
    attendanceStatus: attendanceStatus || "Present (Biometric Verified)",
    trainingStatus: trainingStatus || "Valid",
    trainingValidUntil: trainingValidUntil || "31 Dec 2026",
    medicalFitness: medicalFitness || "Valid Class I",
    bloodGroup: bloodGroup || "O +ve",
    emergencyContact: emergencyContact || "+91 98351 12345"
  });

  response.status(201).json(worker);
}

// Worker Checklist Tasks
export async function getWorkerTasks(
  _request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const tasks = await WorkerTask.find({}).sort({ createdAt: 1 }).lean();
  response.json(tasks);
}

export async function toggleWorkerTask(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const { id } = request.params;
  if (!validId(id)) {
    response.status(404).json({ message: "Task not found" });
    return;
  }

  const task = await WorkerTask.findById(id);
  if (!task) {
    response.status(404).json({ message: "Task not found" });
    return;
  }

  task.done = !task.done;
  task.time = task.done
    ? new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "Pending";
  task.completedAt = task.done ? new Date() : undefined;
  if (task.done) {
    task.status = "Completed";
  } else {
    task.status = "Pending";
  }
  await task.save();
  response.json(task);
}

// Worker Attendance Turnstile Records
export async function getWorkerAttendance(
  _request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const logs = await WorkerAttendance.find({}).sort({ createdAt: -1 }).lean();
  response.json(logs);
}

// === Feature 1: Assigned Actions for the currently logged-in worker ===

export async function getAssignedActions(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const userId = request.user!.id;

  const tasks = await WorkerTask.find({ userId })
    .populate("mineId", "name code location")
    .populate("complianceId", "requirement category dueDate expiry status")
    .sort({ dueDate: 1, createdAt: -1 })
    .lean();

  // Mark overdue tasks
  const now = new Date();
  const enriched = tasks.map((task) => {
    const effectiveStatus =
      task.status !== "Completed" && task.dueDate && new Date(task.dueDate).getTime() < now.getTime()
        ? "Overdue"
        : task.status;
    return { ...task, status: effectiveStatus };
  });

  response.json({ data: enriched, total: enriched.length });
}

export async function updateTaskStatus(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const { id } = request.params;
  const userId = request.user!.id;

  if (!validId(id)) {
    response.status(404).json({ message: "Task not found" });
    return;
  }

  const task = await WorkerTask.findById(id);
  if (!task) {
    response.status(404).json({ message: "Task not found" });
    return;
  }

  // Workers can only update their own tasks
  if (String(task.userId) !== userId) {
    response.status(403).json({ message: "You can only update your own tasks" });
    return;
  }

  const body = request.body as Record<string, unknown>;

  if (body.status && TASK_STATUSES.includes(body.status as never)) {
    task.status = body.status as typeof task.status;
    if (task.status === "Completed") {
      task.done = true;
      task.completedAt = new Date();
      task.time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } else {
      task.done = false;
      task.completedAt = undefined;
    }
  }
  if (typeof body.notes === "string") {
    task.notes = body.notes.trim();
  }

  await task.save();

  const populated = await WorkerTask.findById(task._id)
    .populate("mineId", "name code location")
    .populate("complianceId", "requirement category dueDate expiry status")
    .lean();

  response.json(populated ?? task);
}
