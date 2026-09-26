import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InspectionRecord } from '../types';

const INSPECTIONS_KEY = 'INSPECTIONS_KEY';

export async function saveInspection(inspection: InspectionRecord): Promise<void> {
  const existing = await loadInspections();
  existing.push(inspection);
  await AsyncStorage.setItem(INSPECTIONS_KEY, JSON.stringify(existing));
}

export async function loadInspections(): Promise<InspectionRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(INSPECTIONS_KEY);
    if (stored) {
      return JSON.parse(stored) as InspectionRecord[];
    }
    return [];
  } catch {
    return [];
  }
}
