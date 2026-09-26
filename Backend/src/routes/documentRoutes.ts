import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listDocuments, createDocument, deleteDocument } from "../controllers/documentController";

const router = Router();

router.use(authenticate);
router.get("/", listDocuments);
router.post("/", createDocument);
router.delete("/:id", deleteDocument);

export default router;
