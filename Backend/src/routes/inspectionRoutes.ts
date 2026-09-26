import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { createInspection, getInspection, listInspections, updateInspection } from "../controllers/inspectionController";

const router = Router();
router.use(authenticate);
router.get("/", listInspections);
router.get("/:id", getInspection);
// Statutory inspections must be created by an authorized inspection role.
// Workers report field hazards through the incident workflow instead.
router.post("/", authorize("admin", "mine_manager", "safety_officer", "inspector"), createInspection);
router.patch("/:id", authorize("admin", "mine_manager", "safety_officer", "inspector"), updateInspection);
export default router;
