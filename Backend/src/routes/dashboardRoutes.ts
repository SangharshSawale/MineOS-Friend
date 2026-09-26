import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getDashboardSummary,
  getMineRiskRanking,
  getOpenCorrectiveActions,
  getRecentInspections
} from "../controllers/dashboardController";

const router = Router();

router.use(authenticate);
router.get("/summary", getDashboardSummary);
router.get("/mine-risk-ranking", getMineRiskRanking);
router.get("/recent-inspections", getRecentInspections);
router.get("/open-actions", getOpenCorrectiveActions);

export default router;