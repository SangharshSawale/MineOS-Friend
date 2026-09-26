import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HazardReport } from '../types';

const HAZARD_REPORTS_KEY = 'HAZARD_REPORTS_KEY';

export async function saveHazardReport(report: HazardReport): Promise<void> {
  const existing = await loadHazardReports();
  existing.push(report);
  await AsyncStorage.setItem(HAZARD_REPORTS_KEY, JSON.stringify(existing));
}

export async function loadHazardReports(): Promise<HazardReport[]> {
  try {
    const stored = await AsyncStorage.getItem(HAZARD_REPORTS_KEY);
    if (stored) {
      return JSON.parse(stored) as HazardReport[];
    }
    return [];
  } catch {
    return [];
  }
}
