import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getAiRiskAnalytics } from "../controllers/aiRiskController";

const router = Router();

router.use(authenticate);
router.get("/analytics", getAiRiskAnalytics);

export default router;
