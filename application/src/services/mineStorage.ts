import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Mine } from '../types';

export const MINES_KEY = 'MINES_KEY';

const mockMines: Mine[] = [
  {
    _id: '1',
    name: 'North Ridge Coal Mine',
    code: 'NR-001',
    location: 'Jharkhand, India',
    operator: 'Coal India Ltd.',
    status: 'active',
    createdBy: 'local',
  },
  {
    _id: '2',
    name: 'East Valley Mine',
    code: 'EV-002',
    location: 'Odisha, India',
    operator: 'Eastern Coalfields',
    status: 'active',
    createdBy: 'local',
  },
  {
    _id: '3',
    name: 'South Pit Mine',
    code: 'SP-003',
    location: 'Chhattisgarh, India',
    operator: 'SECL',
    status: 'inactive',
    createdBy: 'local',
  },
];

export async function loadMines(): Promise<Mine[]> {
  try {
    const stored = await AsyncStorage.getItem(MINES_KEY);
    if (stored) {
      return JSON.parse(stored) as Mine[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveMines(mines: Mine[]): Promise<void> {
  await AsyncStorage.setItem(MINES_KEY, JSON.stringify(mines));
}

export async function getActiveMines(): Promise<Mine[]> {
  const mines = await loadMines();
  return mines.filter((mine) => mine.status === 'active');
}

export function getMockMines(): Mine[] {
  return mockMines;
}
