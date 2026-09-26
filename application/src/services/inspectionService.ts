import api, { logApiError } from './api';
import { uploadGeoTaggedImage } from './uploadService';
import type { ChecklistItemResult, GpsCoordinates, InspectionRecord, InspectionType } from '../types';

interface CreateInspectionPayload {
  mineId: string;
  inspectorId: string;
  type: string;
  scheduledFor: string;
  completedOn: string;
  status: 'completed';
  observations: string;
  location: string;
  gps: GpsCoordinates;
  evidence: Array<Record<string, unknown>>;
}

function isValidMongoId(id: string | undefined): boolean {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
}

function buildObservationsSummary(
  inspectionType: InspectionType,
  checklistItems: ChecklistItemResult[],
): string {
  const lines = checklistItems.map((item) => {
    const base = `${item.label}: ${item.status.toUpperCase()}`;
    if (item.violation?.observationNotes) {
      return `${base} — ${item.violation.observationNotes} (Severity: ${item.violation.severity})`;
    }
    return base;
  });

  return `Mobile inspection (${inspectionType})\n${lines.join('\n')}`;
}

async function collectEvidence(
  checklistItems: ChecklistItemResult[],
): Promise<Array<Record<string, unknown>>> {
  const evidence: Array<Record<string, unknown>> = [];

  for (const item of checklistItems) {
    const geoTaggedImage = item.violation?.geoTaggedImage;
    if (!geoTaggedImage) {
      continue;
    }

    const uploaded = await uploadGeoTaggedImage(
      geoTaggedImage,
      `inspection_${item.id}_evidence.jpg`,
    );
    evidence.push({ ...uploaded });
  }

  return evidence;
}

export async function submitInspection(record: InspectionRecord): Promise<void> {
  const now = new Date().toISOString();

  if (!isValidMongoId(record.mineId)) {
    throw new Error('A valid mine must be selected before submitting an inspection.');
  }

  if (!isValidMongoId(record.inspectorId)) {
    throw new Error('Inspector session is invalid. Please sign in again.');
  }

  try {
    const evidence = await collectEvidence(record.checklistItems);

    const payload: CreateInspectionPayload = {
      mineId: record.mineId,
      inspectorId: record.inspectorId,
      type: record.inspectionType,
      scheduledFor: record.submittedAt || now,
      completedOn: now,
      status: 'completed',
      location: record.mineLocation,
      gps: record.gps,
      observations: buildObservationsSummary(record.inspectionType, record.checklistItems),
      evidence,
    };

    if (__DEV__) {
      console.log('[inspectionService] Submitting payload:', JSON.stringify(payload, null, 2));
    }

    await api.post('/inspections', payload);
  } catch (err) {
    logApiError('submitInspection', err);
    throw err;
  }
}
