import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import mineRoutes from "./routes/mineRoutes";
import inspectionRoutes from "./routes/inspectionRoutes";
import violationRoutes from "./routes/violationRoutes";
import correctiveActionRoutes from "./routes/correctiveActionRoutes";
import incidentRoutes from "./routes/incidentRoutes";
import alertRoutes from "./routes/alertRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import complianceRoutes from "./routes/complianceRoutes";
import reportRoutes from "./routes/reportRoutes";
import auditRoutes from "./routes/auditRoutes";
import contractorRoutes from "./routes/contractorRoutes";
import aiRiskRoutes from "./routes/aiRiskRoutes";
import gisRoutes from "./routes/gisRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import userRoutes from "./routes/userRoutes";
import aiAssistantRoutes from "./routes/aiAssistantRoutes";
import documentRoutes from "./routes/documentRoutes";
import productionRoutes from "./routes/productionRoutes";
import environmentRoutes from "./routes/environmentRoutes";
import path from "path";
import workerRoutes from "./routes/workerRoutes";
import approvalRoutes from "./routes/approvalRoutes";
import safetyObservationRoutes from "./routes/safetyObservationRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";

export const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin,
    credentials: true,
  })
);
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.get("/api/health", (_request, response) => response.json({ status: "ok", service: "mineos-backend", timestamp: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/mines", mineRoutes);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/corrective-actions", correctiveActionRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/contractors", contractorRoutes);
app.use("/api/ai-risk", aiRiskRoutes);
app.use("/api/gis", gisRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai-assistant", aiAssistantRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/environment", environmentRoutes);
app.use("/api/workers", workerRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/observations", safetyObservationRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use(errorHandler);