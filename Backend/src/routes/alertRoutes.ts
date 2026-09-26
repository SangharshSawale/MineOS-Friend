import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getRecentAlerts, listAlerts, setAlertRead } from "../controllers/alertController";

const router = Router();

router.use(authenticate);
router.get("/", listAlerts);
router.get("/recent", getRecentAlerts);
router.patch("/:id/read", setAlertRead);

export default router;
