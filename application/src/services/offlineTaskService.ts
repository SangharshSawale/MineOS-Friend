/**
 * offlineTaskService.ts
 * Feature 2: Offline-first task management.
 *
 * Responsibilities:
 *  - Cache assigned tasks in AsyncStorage so they are available offline.
 *  - Maintain a persistent sync queue of local status updates.
 *  - Merge server updates back into the local cache on reconnection.
 *  - Provide conflict resolution using timestamps (server wins if newer).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AssignedAction, SyncQueueItem, TaskStatus } from '../types';

const TASKS_CACHE_KEY = 'mineos_tasks_cache';
const SYNC_QUEUE_KEY = 'mineos_tasks_sync_queue';

// ─── Cache ──────────────────────────────────────────────────────────────────

/** Persist the latest server-fetched tasks list locally. */
export async function cacheTasksLocally(tasks: AssignedAction[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_CACHE_KEY, JSON.stringify({
    tasks,
    cachedAt: new Date().toISOString(),
  }));
}

/** Read the locally cached tasks. Returns empty array if nothing cached. */
export async function getLocalTasks(): Promise<AssignedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(TASKS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { tasks: AssignedAction[]; cachedAt: string };
    return Array.isArray(parsed.tasks) ? parsed.tasks : [];
  } catch {
    return [];
  }
}

/**
 * Apply a local (offline) status change directly to the cached task list.
 * This immediately reflects the worker's change in the UI while offline.
 */
export async function applyLocalStatusChange(
  taskId: string,
  status: TaskStatus,
  notes?: string,
): Promise<void> {
  const tasks = await getLocalTasks();
  const now = new Date().toISOString();
  const updated = tasks.map((t) => {
    if (t._id !== taskId) return t;
    return {
      ...t,
      status,
      ...(notes !== undefined ? { notes } : {}),
      ...(status === 'Completed' ? { completedAt: now, done: true } : { done: false }),
      updatedAt: now,
    };
  });
  await AsyncStorage.setItem(TASKS_CACHE_KEY, JSON.stringify({
    tasks: updated,
    cachedAt: new Date().toISOString(),
  }));
}

/**
 * Merge server-fresh task list into local cache.
 * Server data wins UNLESS a pending sync queue item is newer than the server record.
 */
export async function mergeServerTasks(serverTasks: AssignedAction[]): Promise<AssignedAction[]> {
  const queue = await getSyncQueue();
  const pendingByTaskId: Record<string, SyncQueueItem> = {};
  for (const item of queue) {
    if (item.action === 'updateStatus') {
      // Keep the most-recently-queued pending item per task
      const existing = pendingByTaskId[item.taskId];
      if (!existing || item.createdAt > existing.createdAt) {
        pendingByTaskId[item.taskId] = item;
      }
    }
  }

  const merged = serverTasks.map((serverTask) => {
    const pending = pendingByTaskId[serverTask._id];
    if (!pending) return serverTask; // no local pending change — server wins

    const pendingTime = new Date(pending.createdAt).getTime();
    const serverTime = serverTask.updatedAt ? new Date(serverTask.updatedAt).getTime() : 0;

    // Local pending change is newer than server — keep local version
    if (pendingTime > serverTime) {
      const now = pending.createdAt;
      return {
        ...serverTask,
        status: pending.payload.status,
        ...(pending.payload.notes !== undefined ? { notes: pending.payload.notes } : {}),
        ...(pending.payload.status === 'Completed'
          ? { completedAt: now, done: true }
          : { done: false }),
      };
    }
    return serverTask; // server is newer — server wins
  });

  await cacheTasksLocally(merged);
  return merged;
}

// ─── Sync Queue ──────────────────────────────────────────────────────────────

/** Read the full persistent sync queue. */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Add a new operation to the sync queue. */
export async function enqueueSyncOperation(item: SyncQueueItem): Promise<void> {
  const queue = await getSyncQueue();

  // Deduplicate: if a pending item for the same task already exists, update it
  // rather than creating a duplicate operation.
  const existingIndex = queue.findIndex(
    (q) => q.taskId === item.taskId && q.action === item.action,
  );
  if (existingIndex >= 0) {
    queue[existingIndex] = item; // overwrite with the latest intent
  } else {
    queue.push(item);
  }

  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/** Mark a queue item as successfully synced (remove it from the queue). */
export async function removeSyncQueueItem(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const filtered = queue.filter((item) => item.id !== id);
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
}

/** Increment the retry count for a failed sync item. */
export async function incrementRetryCount(id: string): Promise<void> {
  const queue = await getSyncQueue();
  const updated = queue.map((item) =>
    item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item,
  );
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updated));
}

/** Returns number of pending (unsynced) operations. */
export async function getPendingCount(): Promise<number> {
  const queue = await getSyncQueue();
  return queue.length;
}
