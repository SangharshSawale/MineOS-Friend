import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { uploadMiddleware } from "../middleware/uploadMiddleware";
import { getEvidenceFile, uploadEvidenceFile } from "../controllers/uploadController";

const router = Router();

// Allow public read for evidence files so <img> tags and document viewers can load them
router.get("/:storageKey", getEvidenceFile);

// Require authentication for uploading files
router.use(authenticate);
router.post("/", uploadMiddleware.single("file"), uploadEvidenceFile);

export default router;
