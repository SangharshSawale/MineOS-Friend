import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listAuditLogs, verifyAuditChain } from "../controllers/auditController";

const router = Router();

router.use(authenticate);
router.get("/verify", verifyAuditChain);
router.get("/", listAuditLogs);

export default router;
