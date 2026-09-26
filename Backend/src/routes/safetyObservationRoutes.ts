import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  listObservations,
  createObservation,
  updateObservationStatus
} from "../controllers/safetyObservationController";

const router = Router();

router.use(authenticate);
router.get("/", listObservations);
router.post("/", createObservation);
router.patch("/:id/status", updateObservationStatus);

export default router;
