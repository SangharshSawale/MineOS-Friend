import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Mine } from "../models/Mine";
import { Incident } from "../models/Incident";
import { Inspection } from "../models/Inspection";
import { calculateMineMetrics } from "./dashboardController";

// Canonical Coal India mining coordinates if not set explicitly
const DEFAULT_COALFIELD_COORDS: Record<string, { lat: number; lng: number }> = {
  JHARIA: { lat: 23.7505, lng: 86.4208 },
  RANIGANJ: { lat: 23.6212, lng: 87.1245 },
  KORBA: { lat: 22.3595, lng: 82.7501 },
  SINGRAULI: { lat: 24.1997, lng: 82.6644 },
  TALCHER: { lat: 20.9509, lng: 85.2167 },
  BOKARO: { lat: 23.7836, lng: 85.9622 },
  CHANDRAPUR: { lat: 19.9542, lng: 79.3038 },
  NAGPUR: { lat: 21.1458, lng: 79.0882 }
};

export async function getGisFeatures(
  _request: AuthenticatedRequest,
  response: Response
): Promise<void> {
  const [mines, incidents, inspections] = await Promise.all([
    Mine.find({}).lean(),
    Incident.find({}).populate("mineId", "name code").sort({ occurredAt: -1 }).limit(20).lean(),
    Inspection.find({ gps: { $exists: true } }).populate("mineId", "name code").sort({ scheduledFor: -1 }).limit(20).lean()
  ]);

  const mineFeatures = await Promise.all(
    mines.map(async (mine, idx) => {
      const metrics = await calculateMineMetrics(mine._id);
      const hasCustomCoords =
        mine.coordinates &&
        typeof mine.coordinates.latitude === "number" &&
        !isNaN(mine.coordinates.latitude) &&
        typeof mine.coordinates.longitude === "number" &&
        !isNaN(mine.coordinates.longitude);

      const codeKey = Object.keys(DEFAULT_COALFIELD_COORDS).find((k) =>
        mine.code.toUpperCase().includes(k) || mine.name.toUpperCase().includes(k)
      );

      const fallbackBase = codeKey ? DEFAULT_COALFIELD_COORDS[codeKey] : { lat: 23.5 + (idx % 3) * 0.4, lng: 85.5 + (idx % 4) * 0.6 };
      const finalCoords = hasCustomCoords
        ? { latitude: (mine.coordinates as { latitude: number; longitude: number }).latitude, longitude: (mine.coordinates as { latitude: number; longitude: number }).longitude }
        : { latitude: fallbackBase.lat, longitude: fallbackBase.lng };

      return {
        id: mine._id,
        type: "mine",
        name: mine.name,
        code: mine.code,
        location: mine.location,
        coordinates: finalCoords,
        riskScore: metrics.riskScore,
        riskLevel: metrics.riskLevel,
        compliancePercent: metrics.compliancePercent,
        openViolations: metrics.openViolations,
        criticalViolations: metrics.criticalViolations
      };
    })
  );

  const incidentFeatures = incidents
    .filter((inc) => inc.evidence.some((e) => e.gps && e.gps.latitude) || inc.mineId)
    .map((inc) => {
      const evidenceWithGps = inc.evidence.find((e) => e.gps && e.gps.latitude);
      const mineObj = inc.mineId as { name?: string; code?: string } | undefined;
      const codeKey = Object.keys(DEFAULT_COALFIELD_COORDS).find((k) =>
        mineObj?.code?.toUpperCase().includes(k) || mineObj?.name?.toUpperCase().includes(k)
      );
      const fallback = codeKey ? DEFAULT_COALFIELD_COORDS[codeKey] : { lat: 23.75, lng: 86.42 };

      return {
        id: inc._id,
        type: "incident",
        title: inc.title,
        severity: inc.severity,
        status: inc.status,
        mineName: mineObj?.name ?? "Mine Site",
        occurredAt: inc.occurredAt,
        coordinates: {
          latitude: evidenceWithGps?.gps?.latitude ?? fallback.lat + 0.015,
          longitude: evidenceWithGps?.gps?.longitude ?? fallback.lng + 0.015
        }
      };
    });

  response.json({
    generatedAt: new Date().toISOString(),
    center: { latitude: 23.7505, longitude: 86.4208 }, // Coal belt center
    mines: mineFeatures,
    incidents: incidentFeatures
  });
}
