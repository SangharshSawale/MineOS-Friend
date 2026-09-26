/**
 * AssignedActionsScreen.tsx
 * Feature 1 + 2: Shows tasks assigned to the logged-in worker.
 * Works fully ONLINE and OFFLINE.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchAssignedActions } from '../services/taskService';
import {
  cacheTasksLocally,
  getLocalTasks,
  mergeServerTasks,
  getPendingCount,
} from '../services/offlineTaskService';
import {
  getConnectionStatus,
  subscribeToNetwork,
  processSyncQueue,
  type ConnectionStatus,
} from '../services/networkService';
import colors from '../theme/colors';
import type { AssignedAction, MessagesStackParamList, SyncStatus } from '../types';

type Props = NativeStackScreenProps<MessagesStackParamList, 'AssignedActions'>;

const STATUS_COLORS: Record<string, string> = {
  'Pending': '#F59E0B',
  'In Progress': '#3B82F6',
  'Completed': colors.success,
  'Overdue': colors.error,
};

const PRIORITY_COLORS: Record<string, string> = {
  'Low': colors.success,
  'Medium': '#F59E0B',
  'High': '#EF4444',
  'Critical': '#7C3AED',
};

function SyncBanner({ status, pendingCount }: { status: SyncStatus; pendingCount: number }) {
  if (status === 'synced') return null;

  const configs: Partial<Record<SyncStatus, { bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }>> = {
    offline: { bg: '#64748B', text: 'Offline — showing cached data', icon: 'cloud-offline' },
    pending: { bg: '#D97706', text: `${pendingCount} change${pendingCount !== 1 ? 's' : ''} waiting to sync`, icon: 'time' },
    syncing: { bg: '#3B82F6', text: 'Syncing...', icon: 'sync' },
    failed: { bg: colors.error, text: 'Sync failed — tap to retry', icon: 'warning' },
  };

  const config = configs[status];
  if (!config) return null;
  return (
    <View style={[styles.syncBanner, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={14} color="#fff" />
      <Text style={styles.syncBannerText}>{config.text}</Text>
    </View>
  );
}

function TaskCard({ task, onPress }: { task: AssignedAction; onPress: () => void }) {
  const mine = typeof task.mineId === 'object' && task.mineId ? task.mineId : null;
  const statusColor = STATUS_COLORS[task.status] ?? '#64748B';
  const priorityColor = PRIORITY_COLORS[task.priority] ?? '#64748B';

  const dueDateDisplay = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Task: ${task.title}`}
    >
      <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{task.status}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: priorityColor + '22' }]}>
            <Text style={[styles.badgeText, { color: priorityColor }]}>{task.priority}</Text>
          </View>
        </View>

        <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>

        <View style={styles.cardMeta}>
          <Ionicons name="business" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText}>{mine?.name ?? 'Mine'}</Text>
        </View>

        <View style={styles.cardMeta}>
          <Ionicons name="document-text" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText}>{task.category}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <Ionicons name="calendar" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>Due: {dueDateDisplay}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
        </View>
      </View>
    </Pressable>
  );
}

export default function AssignedActionsScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<AssignedAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState(0);
  const [connection, setConnection] = useState<ConnectionStatus>('unknown');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const updatePendingCount = useCallback(async () => {
    const count = await getPendingCount();
    if (isMounted.current) {
      setPendingCount(count);
      if (count > 0 && syncStatus !== 'syncing') setSyncStatus('pending');
    }
  }, [syncStatus]);

  const loadTasksOnline = useCallback(async () => {
    try {
      const serverTasks = await fetchAssignedActions();
      const merged = await mergeServerTasks(serverTasks);
      if (isMounted.current) {
        setTasks(merged);
        const pending = await getPendingCount();
        setPendingCount(pending);
        setSyncStatus(pending > 0 ? 'pending' : 'synced');
      }
    } catch {
      // Fall back to local cache on API error
      const local = await getLocalTasks();
      if (isMounted.current) {
        setTasks(local);
        setSyncStatus(local.length > 0 ? 'pending' : 'offline');
      }
    }
  }, []);

  const loadTasksOffline = useCallback(async () => {
    const local = await getLocalTasks();
    if (isMounted.current) {
      setTasks(local);
      const pending = await getPendingCount();
      setPendingCount(pending);
      setSyncStatus(pending > 0 ? 'pending' : 'offline');
    }
  }, []);

  const loadTasks = useCallback(async (showLoader = true) => {
    if (showLoader && isMounted.current) setLoading(true);
    const status = await getConnectionStatus();
    if (isMounted.current) setConnection(status);

    if (status === 'online') {
      await loadTasksOnline();
    } else {
      await loadTasksOffline();
    }
    if (isMounted.current) setLoading(false);
  }, [loadTasksOnline, loadTasksOffline]);

  const handleSync = useCallback(async () => {
    if (connection !== 'online') {
      Alert.alert('Offline', 'Please restore internet connectivity to sync changes.');
      return;
    }
    setSyncStatus('syncing');
    try {
      const { synced, failed } = await processSyncQueue();
      await loadTasksOnline();
      if (isMounted.current) {
        if (failed > 0) setSyncStatus('failed');
        else setSyncStatus(synced > 0 ? 'synced' : 'synced');
      }
    } catch {
      if (isMounted.current) setSyncStatus('failed');
    }
  }, [connection, loadTasksOnline]);

  // Network change listener
  useEffect(() => {
    const unsub = subscribeToNetwork(async (status) => {
      if (!isMounted.current) return;
      setConnection(status);
      if (status === 'online') {
        // Auto-sync on reconnection
        setSyncStatus('syncing');
        try {
          await processSyncQueue();
          await loadTasksOnline();
          if (isMounted.current) {
            const pending = await getPendingCount();
            setSyncStatus(pending > 0 ? 'pending' : 'synced');
          }
        } catch {
          if (isMounted.current) setSyncStatus('failed');
        }
      } else {
        setSyncStatus('offline');
      }
    });
    return unsub;
  }, [loadTasksOnline]);

  // Load on screen focus
  useFocusEffect(
    useCallback(() => {
      loadTasks();
      updatePendingCount();
    }, [loadTasks, updatePendingCount]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks(false);
    setRefreshing(false);
  }, [loadTasks]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading your tasks...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <SyncBanner status={syncStatus} pendingCount={pendingCount} />

      {syncStatus === 'failed' && (
        <Pressable style={styles.retryButton} onPress={handleSync}>
          <Ionicons name="refresh" size={14} color={colors.error} />
          <Text style={styles.retryText}>Tap to retry sync</Text>
        </Pressable>
      )}

      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={() => navigation.navigate('TaskDetail', { task: item })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.gold]}
            tintColor={colors.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={52} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Assigned Actions</Text>
            <Text style={styles.emptySubtitle}>
              {connection === 'offline'
                ? 'You are offline and have no cached tasks.'
                : 'No statutory obligations have been assigned to you yet.'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          tasks.length > 0 ? (
            <Text style={styles.listHeader}>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  syncBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  retryText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  listHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.navyLight,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardAccent: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    paddingLeft: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 21,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
