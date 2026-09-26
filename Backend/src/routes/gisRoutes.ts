import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getGisFeatures } from "../controllers/gisController";

const router = Router();

router.use(authenticate);
router.get("/features", getGisFeatures);

export default router;
