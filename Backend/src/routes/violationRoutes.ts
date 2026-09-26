import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { createViolation, listViolations, updateViolation } from "../controllers/violationController";

const router = Router();
router.use(authenticate);
router.get("/", listViolations);
router.post("/", authorize("admin", "mine_manager", "safety_officer", "inspector"), createViolation);
router.patch("/:id", authorize("admin", "mine_manager", "safety_officer", "inspector"), updateViolation);
export default router;