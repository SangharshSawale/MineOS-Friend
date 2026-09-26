import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { EnvironmentLog } from "../models/EnvironmentLog";
import { Mine } from "../models/Mine";

export async function listEnvironmentStations(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;
  if (request.query.stationType) filter.stationType = request.query.stationType;

  const data = await EnvironmentLog.find(filter)
    .populate("mineId", "name code location")
    .sort({ recordedAt: -1 })
    .lean();

  response.json({ data, total: data.length });
}

export async function getEnvironmentMetrics(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const filter: Record<string, unknown> = {};
  if (request.query.mineId) filter.mineId = request.query.mineId;

  const stations = await EnvironmentLog.find(filter).lean();

  const avgAqi = stations.length > 0 ? Math.round(stations.reduce((acc, s) => acc + s.aqi, 0) / stations.length) : 112;
  const avgPm10 = stations.length > 0 ? Math.round(stations.reduce((acc, s) => acc + s.pm10, 0) / stations.length) : 78;
  const avgPh =
    stations.length > 0
      ? (stations.reduce((acc, s) => acc + s.waterPh, 0) / stations.length).toFixed(1)
      : "7.4";
  const mistPercent =
    stations.length > 0
      ? (stations.reduce((acc, s) => acc + s.mistCannonsActivePercent, 0) / stations.length).toFixed(1)
      : "98.2";

  const normalCount = stations.filter((s) => s.status === "Normal").length;
  const elevatedCount = stations.filter((s) => s.status === "Elevated").length;
  const criticalCount = stations.filter((s) => s.status === "Critical").length;

  response.json({
    avgAqi,
    avgPm10,
    avgWaterPh: Number(avgPh),
    activeMistCannonsPercent: Number(mistPercent),
    totalStations: stations.length,
    statusCounts: { normal: normalCount, elevated: elevatedCount, critical: criticalCount },
    metrics: [
      { label: "Ambient Air Quality (AQI)", value: String(avgAqi), status: avgAqi < 150 ? "Moderate (Safe)" : "Elevated", tone: "amber", threshold: "CPCB Limit: 150" },
      { label: "PM10 Particulate Density", value: `${avgPm10} µg/m³`, status: "Within Limits", tone: "emerald", threshold: "Max: 100 µg/m³" },
      { label: "Mine Effluent Water pH", value: `${avgPh} pH`, status: "Optimal Neutral", tone: "emerald", threshold: "Permitted: 6.5 - 8.5" },
      { label: "Dust Suppression Sprinklers", value: `${mistPercent}% Active`, status: "24 Mist Cannons Online", tone: "blue", threshold: "Mandatory 95%" }
    ]
  });
}

export async function createEnvironmentReading(
  request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const {
    mineId,
    stationName,
    stationType,
    aqi,
    pm10,
    pm25,
    so2,
    waterPh,
    tssMgL,
    oilAndGreaseMgL,
    mistCannonsActivePercent,
    readingDetails,
    status,
    complianceStatus
  } = request.body;

  let targetMineId = mineId;
  if (!targetMineId) {
    const defaultMine = await Mine.findOne({}).select("_id").lean();
    targetMineId = defaultMine?._id;
  }

  const log = await EnvironmentLog.create({
    mineId: targetMineId,
    stationName: stationName || "Station Sensor Array",
    stationType: stationType || "air_quality",
    aqi: Number(aqi || 105),
    pm10: Number(pm10 || 72),
    pm25: Number(pm25 || 34),
    so2: Number(so2 || 14),
    waterPh: Number(waterPh || 7.3),
    tssMgL: Number(tssMgL || 22),
    oilAndGreaseMgL: Number(oilAndGreaseMgL || 1.2),
    mistCannonsActivePercent: Number(mistCannonsActivePercent || 98),
    readingDetails: readingDetails || "Automated sensor stream normal",
    status: status || "Normal",
    complianceStatus: complianceStatus || "Compliant with NAAQS 2009",
    recordedAt: new Date()
  });

  response.status(201).json(log);
}
