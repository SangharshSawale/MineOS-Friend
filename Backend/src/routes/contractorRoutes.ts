import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  createContractor,
  deleteContractor,
  listContractors,
  updateContractor
} from "../controllers/contractorController";

const router = Router();

router.use(authenticate);

router.get("/", listContractors);
router.post(
  "/",
  authorize("admin", "mine_manager", "safety_officer"),
  createContractor
);
router.patch(
  "/:id",
  authorize("admin", "mine_manager", "safety_officer"),
  updateContractor
);
router.delete("/:id", authorize("admin", "mine_manager"), deleteContractor);

export default router;
