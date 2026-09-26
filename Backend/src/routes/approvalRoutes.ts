import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listApprovals, createApproval, reviewApproval } from "../controllers/approvalController";

const router = Router();

router.use(authenticate);
router.get("/", listApprovals);
router.post("/", createApproval);
router.patch("/:id/review", reviewApproval);

export default router;
