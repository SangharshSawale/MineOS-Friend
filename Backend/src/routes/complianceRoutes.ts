import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  createCompliance,
  listCompliance,
  updateCompliance
} from "../controllers/complianceController";

const router = Router();

router.use(authenticate);

router.get("/", listCompliance);
router.post(
  "/",
  authorize("admin", "mine_manager", "safety_officer"),
  createCompliance
);
router.patch(
  "/:id",
  authorize("admin", "mine_manager", "safety_officer", "inspector"),
  updateCompliance
);

export default router;
