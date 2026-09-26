import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listProductionLogs, getProductionKpis, createProductionLog } from "../controllers/productionController";

const router = Router();

router.use(authenticate);
router.get("/", listProductionLogs);
router.get("/kpis", getProductionKpis);
router.post("/", createProductionLog);

export default router;
