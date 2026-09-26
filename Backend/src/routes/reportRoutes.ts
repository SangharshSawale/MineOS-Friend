import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getComplianceAuditReport,
  getDetailedReport,
  getSummaryReport
} from "../controllers/reportController";

const router = Router();

router.use(authenticate);
router.get("/summary", getSummaryReport);
router.get("/compliance-audit", getComplianceAuditReport);
router.get("/detailed", getDetailedReport);

export default router;
