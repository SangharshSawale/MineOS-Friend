import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { handleAiAssistantQuery } from "../controllers/aiAssistantController";

const router = Router();

router.use(authenticate);
router.post("/query", handleAiAssistantQuery);

export default router;
