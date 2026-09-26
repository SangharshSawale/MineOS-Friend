import api, { logApiError } from './api';
import { uploadGeoTaggedImage, type UploadedEvidence } from './uploadService';
import type { GeoTaggedImage, GpsCoordinates } from '../types';

export interface SubmitHazardPayload {
  description: string;
  geoTaggedImage?: GeoTaggedImage;
  gps?: GpsCoordinates;
  mineId?: string;
}

/**
 * Submits a phone hazard report through the same incident workflow used by
 * the web portal. This keeps the incident visible in the portal register,
 * alert queue, priority-inspection flow, investigation dossier, and closure
 * process instead of creating a separate mobile-only record.
 */
export async function submitHazardReport(payload: SubmitHazardPayload): Promise<void> {
  const { description, geoTaggedImage, gps, mineId } = payload;

  if (!mineId) {
    throw new Error('Select your mine before submitting a hazard report.');
  }

  let evidence: UploadedEvidence | undefined;
  let locationCoords: GpsCoordinates | undefined;

  if (geoTaggedImage) {
    evidence = await uploadGeoTaggedImage(geoTaggedImage, 'evidence.jpg');
    locationCoords = {
      latitude: geoTaggedImage.latitude,
      longitude: geoTaggedImage.longitude,
      timestamp: geoTaggedImage.timestamp,
    };
  } else if (gps) {
    locationCoords = gps;
  }

  if (!locationCoords) {
    throw new Error('GPS coordinates are required for hazard reports.');
  }

  const title = description.trim().slice(0, 80) || 'Frontline Hazard Report';
  const location = `Lat ${locationCoords.latitude.toFixed(6)}, Lng ${locationCoords.longitude.toFixed(6)}`;
  const incidentDescription = [
    description.trim(),
    '',
    'Submitted from the MINSOS mobile field app.',
    `GPS location: ${location}.`,
    `Reported at: ${new Date(locationCoords.timestamp).toISOString()}.`,
  ].join('\n');

  const body = {
    mineId,
    title,
    severity: 'high',
    description: incidentDescription,
    occurredAt: locationCoords.timestamp,
    evidence: evidence ? [evidence] : [],
  };

  try {
    await api.post('/incidents', body);
  } catch (err) {
    logApiError('submitHazardReport', err);
    throw err;
  }
}
