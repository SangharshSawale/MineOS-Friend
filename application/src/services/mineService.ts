import api from './api';
import type { CreateMinePayload, Mine, UpdateMinePayload } from '../types';

export async function fetchMines(): Promise<Mine[]> {
  const { data } = await api.get<Mine[]>('/mines');
  return data;
}

export async function fetchMine(id: string): Promise<Mine> {
  const { data } = await api.get<Mine>(`/mines/${id}`);
  return data;
}

export async function createMine(payload: CreateMinePayload): Promise<Mine> {
  const { data } = await api.post<Mine>('/mines', payload);
  return data;
}

export async function updateMine(id: string, payload: UpdateMinePayload): Promise<Mine> {
  const { data } = await api.patch<Mine>(`/mines/${id}`, payload);
  return data;
}

export async function deleteMine(id: string): Promise<void> {
  await api.delete(`/mines/${id}`);
}
