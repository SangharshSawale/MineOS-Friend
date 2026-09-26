import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  listWorkers,
  getWorkersSummary,
  createWorker,
  getWorkerTasks,
  toggleWorkerTask,
  getWorkerAttendance,
  getAssignedActions,
  updateTaskStatus
} from "../controllers/workerController";

const router = Router();

router.use(authenticate);
router.get("/", listWorkers);
router.get("/summary", getWorkersSummary);
router.post("/", createWorker);

// Worker space — checklist tasks (legacy)
router.get("/tasks", getWorkerTasks);
router.patch("/tasks/:id/toggle", toggleWorkerTask);
router.get("/attendance", getWorkerAttendance);

// Feature 1: Assigned Actions from statutory obligations
router.get("/assigned-actions", getAssignedActions);
router.patch("/assigned-actions/:id/status", updateTaskStatus);

export default router;
