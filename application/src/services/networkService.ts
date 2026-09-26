/**
 * networkService.ts
 * Feature 2: Network detection using @react-native-community/netinfo.
 *
 * Provides:
 *  - A hook to read current connectivity.
 *  - Event-based listeners for online/offline transitions.
 *  - A helper to process the sync queue when connectivity returns.
 */

import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { fetchAssignedActions, updateTaskStatus } from './taskService';
import {
  getSyncQueue,
  mergeServerTasks,
  removeSyncQueueItem,
  incrementRetryCount,
  cacheTasksLocally,
} from './offlineTaskService';

export type ConnectionStatus = 'online' | 'offline' | 'unknown';

/** Returns current connectivity status immediately. */
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const state = await NetInfo.fetch();
  return resolveStatus(state);
}

function resolveStatus(state: NetInfoState): ConnectionStatus {
  if (state.isConnected === null) return 'unknown';
  return state.isConnected && state.isInternetReachable !== false ? 'online' : 'offline';
}

/**
 * Subscribe to network changes.
 * @returns unsubscribe function — call it in useEffect cleanup.
 */
export function subscribeToNetwork(
  callback: (status: ConnectionStatus) => void,
): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    callback(resolveStatus(state));
  });
  return unsubscribe;
}

const MAX_RETRIES = 3;

/**
 * Process all pending sync queue items when internet is restored.
 * - Sends each pending change to the backend.
 * - On success: removes the item from the queue and refreshes local cache.
 * - On failure: increments retry count (gives up after MAX_RETRIES).
 */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getSyncQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    if (item.retryCount >= MAX_RETRIES) {
      failed++;
      continue; // give up on this item after too many failures
    }

    try {
      if (item.action === 'updateStatus') {
        await updateTaskStatus(item.taskId, item.payload.status, item.payload.notes);
        await removeSyncQueueItem(item.id);
        synced++;
      }
    } catch {
      await incrementRetryCount(item.id);
      failed++;
    }
  }

  // Refresh local cache from server after syncing
  if (synced > 0) {
    try {
      const freshTasks = await fetchAssignedActions();
      await cacheTasksLocally(freshTasks);
    } catch {
      // Network may have dropped again during refresh — safe to ignore
    }
  }

  return { synced, failed };
}
