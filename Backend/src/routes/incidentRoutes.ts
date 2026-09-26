import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  closeIncident,
  createIncident,
  getIncident,
  investigateIncident,
  listIncidents
} from "../controllers/incidentController";

const router = Router();

router.use(authenticate);

// View list and detail (all authenticated roles including corporate & regulator)
router.get("/", listIncidents);
router.get("/:id", getIncident);

// Report incident: worker, inspector, safety_officer, mine_manager, contractor, admin
router.post(
  "/",
  authorize("worker", "inspector", "safety_officer", "mine_manager", "contractor", "admin"),
  createIncident
);

// Investigate: inspector, safety_officer, mine_manager, admin
router.patch(
  "/:id/investigate",
  authorize("inspector", "safety_officer", "mine_manager", "admin"),
  investigateIncident
);

// Close incident: safety_officer, mine_manager, admin
router.patch(
  "/:id/close",
  authorize("safety_officer", "mine_manager", "admin"),
  closeIncident
);

export default router;
