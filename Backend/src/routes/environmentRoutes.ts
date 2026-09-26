import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  listEnvironmentStations,
  getEnvironmentMetrics,
  createEnvironmentReading
} from "../controllers/environmentController";

const router = Router();

router.use(authenticate);
router.get("/", listEnvironmentStations);
router.get("/metrics", getEnvironmentMetrics);
router.post("/", createEnvironmentReading);

export default router;
