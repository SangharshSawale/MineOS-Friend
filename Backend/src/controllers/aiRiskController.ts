import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Mine } from "../models/Mine";
import { Violation } from "../models/Violation";
import { Incident } from "../models/Incident";
import { calculateMineMetrics } from "./dashboardController";

export async function getAiRiskAnalytics(
  _request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const mines = await Mine.find({}).select("name code location").lean();

  const analytics = await Promise.all(
    mines.map(async (mine, index) => {
      const [metrics, strataViolations, gasIncidents] = await Promise.all([
        calculateMineMetrics(mine._id),
        Violation.countDocuments({
          mineId: mine._id,
          status: { $ne: "resolved" },
          $or: [
            { category: /strata/i },
            { category: /roof/i },
            { title: /roof/i },
            { description: /fall/i }
          ]
        }),
        Incident.countDocuments({
          mineId: mine._id,
          $or: [{ title: /gas/i }, { description: /methane/i }, { description: /ventilation/i }]
        })
      ]);

      // Deterministic pseudo-telemetry based on mine index & metrics
      const hash = (index * 17 + metrics.riskScore * 3) % 100;

      // 1. Roof & Strata Fall Probability (0 - 100%)
      const roofFallProbability = Math.min(
        Math.max(strataViolations * 18 + metrics.criticalViolations * 12 + (hash % 15), 8),
        95
      );

      // 2. Gas Telemetry Simulation (CH4 and CO)
      const ch4Level = Number((0.25 + (hash / 100) * 0.85 + (gasIncidents > 0 ? 0.35 : 0)).toFixed(2)); // Vol %
      const coLevel = Math.round(10 + (hash / 100) * 45 + metrics.criticalViolations * 8); // PPM
      const gasStatus =
        ch4Level > 0.9 || coLevel > 45 ? "Critical" : ch4Level > 0.6 || coLevel > 25 ? "Elevated" : "Normal";

      // 3. Seismic / Micro-tremor Index (0 to 10)
      const seismicIndex = Number((1.5 + (metrics.riskScore / 100) * 6.5 + ((hash % 20) / 10)).toFixed(1));

      // 4. Equipment Breakdown Probability
      const equipmentFailureRisk = Math.min(Math.round(20 + metrics.overdueActions * 7 + (hash % 25)), 90);

      // 5. Automated AI Recommendations
      const recommendations: string[] = [];
      if (roofFallProbability > 50) {
        recommendations.push("Deploy supplementary rock bolting and tele-seismic resin anchors in East haulage.");
      }
      if (gasStatus === "Critical" || ch4Level > 0.8) {
        recommendations.push("Activate auxiliary ventilation fans; restrict hot work within 100m of working face.");
      }
      if (metrics.overdueActions > 2) {
        recommendations.push("Prioritize mechanical overhaul of conveyor belt and dust suppression nozzles.");
      }
      if (recommendations.length === 0) {
        recommendations.push("All AI predictive hazard indicators within standard statutory thresholds.");
      }

      return {
        mineId: mine._id,
        name: mine.name,
        code: mine.code,
        location: mine.location,
        systemRiskScore: metrics.riskScore,
        riskLevel: metrics.riskLevel,
        predictions: {
          roofFallProbability,
          seismicIndex,
          equipmentFailureRisk,
          gasTelemetry: {
            ch4Percentage: ch4Level,
            coPpm: coLevel,
            status: gasStatus,
            ch4Threshold: "1.00% Vol",
            coThreshold: "50 PPM"
          }
        },
        recommendations
      };
    })
  );

  // High hazard sites first
  analytics.sort((a, b) => b.predictions.roofFallProbability - a.predictions.roofFallProbability);

  response.json({
    generatedAt: new Date().toISOString(),
    totalMonitoredSites: mines.length,
    analytics
  });
}
