import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  createCorrectiveAction,
  listCorrectiveActions,
  updateCorrectiveAction,
  submitActionEvidence,
  verifyCorrectiveAction,
  approveCorrectiveAction,
  rejectCorrectiveAction
} from "../controllers/correctiveActionController";

const router = Router();
router.use(authenticate);

// List all corrective actions (workers see only their assigned)
router.get("/", listCorrectiveActions);

// Register a new corrective action — Safety Officer, Mine Manager, Admin, Inspector
router.post("/", authorize("admin", "mine_manager", "safety_officer", "inspector"), createCorrectiveAction);

// Generic update (reassign, change fields) — all roles that participate
router.patch("/:id", authorize("admin", "mine_manager", "safety_officer", "inspector", "contractor", "worker"), updateCorrectiveAction);

// Worker submits evidence — Worker + the roles above who might self-assign
router.patch("/:id/submit", authorize("admin", "mine_manager", "safety_officer", "inspector", "worker"), submitActionEvidence);

// Safety Officer verifies evidence
router.patch("/:id/verify", authorize("admin", "safety_officer"), verifyCorrectiveAction);

// Mine Manager approves and closes
router.patch("/:id/approve", authorize("admin", "mine_manager"), approveCorrectiveAction);

// Safety Officer or Mine Manager rejects back to worker
router.patch("/:id/reject", authorize("admin", "mine_manager", "safety_officer"), rejectCorrectiveAction);

export default router;