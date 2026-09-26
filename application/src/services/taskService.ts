/**
 * taskService.ts
 * Communicates with the real backend /api/workers/assigned-actions endpoints.
 * Used for Feature 1 (online) and Feature 2 (offline fallback via offlineTaskService).
 */
import api from './api';
import type { AssignedAction, TaskStatus } from '../types';

export interface AssignedActionsResponse {
  data: AssignedAction[];
  total: number;
}

/** Fetch assigned actions for the currently authenticated worker. */
export async function fetchAssignedActions(): Promise<AssignedAction[]> {
  const response = await api.get<AssignedActionsResponse>('/workers/assigned-actions');
  return response.data.data;
}

/** Update the status of a task the worker owns. */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  notes?: string,
): Promise<AssignedAction> {
  const response = await api.patch<AssignedAction>(
    `/workers/assigned-actions/${taskId}/status`,
    { status, ...(notes !== undefined ? { notes } : {}) },
  );
  return response.data;
}
