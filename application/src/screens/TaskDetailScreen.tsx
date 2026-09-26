/**
 * TaskDetailScreen.tsx
 * Feature 1 + 2: Full task details with offline-aware status update.
 */
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { updateTaskStatus as apiUpdateTaskStatus } from '../services/taskService';
import {
  applyLocalStatusChange,
  enqueueSyncOperation,
  getPendingCount,
} from '../services/offlineTaskService';
import { getConnectionStatus } from '../services/networkService';
import colors from '../theme/colors';
import type { AssignedAction, MessagesStackParamList, TaskStatus } from '../types';

type Props = NativeStackScreenProps<MessagesStackParamList, 'TaskDetail'>;

const STATUS_OPTIONS: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];

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

function DetailRow({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={16} color={colors.gold} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function TaskDetailScreen({ route, navigation }: Props) {
  const { task: initialTask } = route.params;
  const [task, setTask] = useState<AssignedAction>(initialTask);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus>(
    STATUS_OPTIONS.includes(initialTask.status as TaskStatus)
      ? (initialTask.status as TaskStatus)
      : 'Pending',
  );
  const [notes, setNotes] = useState(initialTask.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ type: 'local' | 'server' | 'error'; message: string } | null>(null);
  const isMounted = useRef(true);

  const mine = typeof task.mineId === 'object' && task.mineId ? task.mineId : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleSave = useCallback(async () => {
    if (selectedStatus === task.status && notes === (task.notes ?? '')) {
      Alert.alert('No Changes', 'Nothing has been changed.');
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const connectionStatus = await getConnectionStatus();

      if (connectionStatus === 'online') {
        // Online: send directly to server
        try {
          const updated = await apiUpdateTaskStatus(task._id, selectedStatus, notes || undefined);
          if (isMounted.current) {
            setTask(updated);
            setSaveResult({ type: 'server', message: '✓ Saved to server' });
          }
        } catch (apiErr) {
          // Server failed — save locally and queue
          await applyLocalStatusChange(task._id, selectedStatus, notes || undefined);
          await enqueueSyncOperation({
            id: `${task._id}-${Date.now()}`,
            taskId: task._id,
            action: 'updateStatus',
            payload: { status: selectedStatus, ...(notes ? { notes } : {}) },
            createdAt: new Date().toISOString(),
            retryCount: 0,
          });
          const pending = await getPendingCount();
          if (isMounted.current) {
            setTask((t) => ({ ...t, status: selectedStatus, notes: notes || t.notes }));
            setSaveResult({
              type: 'local',
              message: `Saved locally (${pending} change${pending !== 1 ? 's' : ''} pending sync)`,
            });
          }
        }
      } else {
        // Offline: save locally and enqueue
        await applyLocalStatusChange(task._id, selectedStatus, notes || undefined);
        await enqueueSyncOperation({
          id: `${task._id}-${Date.now()}`,
          taskId: task._id,
          action: 'updateStatus',
          payload: { status: selectedStatus, ...(notes ? { notes } : {}) },
          createdAt: new Date().toISOString(),
          retryCount: 0,
        });
        const pending = await getPendingCount();
        if (isMounted.current) {
          setTask((t) => ({ ...t, status: selectedStatus, notes: notes || t.notes }));
          setSaveResult({
            type: 'local',
            message: `Saved locally — offline (${pending} pending)`,
          });
        }
      }
    } catch {
      if (isMounted.current) {
        setSaveResult({ type: 'error', message: 'Failed to save. Please try again.' });
      }
    } finally {
      if (isMounted.current) setSaving(false);
    }
  }, [task, selectedStatus, notes]);

  const statusColor = STATUS_COLORS[task.status] ?? '#64748B';
  const priorityColor = PRIORITY_COLORS[task.priority] ?? '#64748B';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header card */}
          <View style={styles.headerCard}>
            <View style={styles.headerBadges}>
              <View style={[styles.badge, { backgroundColor: statusColor + '33' }]}>
                <Text style={[styles.badgeText, { color: statusColor }]}>{task.status}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: priorityColor + '33' }]}>
                <Text style={[styles.badgeText, { color: priorityColor }]}>
                  {task.priority} Priority
                </Text>
              </View>
            </View>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskCategory}>{task.category}</Text>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TASK DETAILS</Text>
            {mine && (
              <DetailRow icon="business" label="Mine / Colliery" value={`${mine.name} (${mine.code})`} />
            )}
            {mine?.location && (
              <DetailRow icon="location" label="Location" value={mine.location} />
            )}
            <DetailRow icon="calendar-outline" label="Due Date" value={formatDate(task.dueDate)} />
            <DetailRow icon="time-outline" label="Assigned On" value={formatDate(task.assignedAt ?? task.createdAt)} />
            {task.completedAt && (
              <DetailRow icon="checkmark-circle" label="Completed On" value={formatDate(task.completedAt)} />
            )}
            {task.notes && (
              <View style={styles.notesBlock}>
                <Text style={styles.detailLabel}>Notes / Conditions</Text>
                <Text style={styles.notesText}>{task.notes}</Text>
              </View>
            )}
          </View>

          {/* Status update */}
          {task.status !== 'Completed' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>UPDATE STATUS</Text>
              <View style={styles.statusOptions}>
                {STATUS_OPTIONS.map((s) => (
                  <Pressable
                    key={s}
                    style={[
                      styles.statusOption,
                      selectedStatus === s && styles.statusOptionSelected,
                      selectedStatus === s && { borderColor: STATUS_COLORS[s] },
                    ]}
                    onPress={() => setSelectedStatus(s)}
                  >
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: selectedStatus === s ? STATUS_COLORS[s] : '#475569' },
                    ]} />
                    <Text style={[
                      styles.statusOptionText,
                      selectedStatus === s && { color: STATUS_COLORS[s], fontWeight: '700' },
                    ]}>
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.detailLabel, { marginBottom: 6 }]}>Remarks (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add remarks or update notes..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {saveResult && (
                <View style={[
                  styles.saveResult,
                  saveResult.type === 'server' && styles.saveResultServer,
                  saveResult.type === 'local' && styles.saveResultLocal,
                  saveResult.type === 'error' && styles.saveResultError,
                ]}>
                  <Text style={styles.saveResultText}>{saveResult.message}</Text>
                </View>
              )}

              <Pressable
                style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.navy} />
                  : <Text style={styles.saveButtonText}>Save Changes</Text>
                }
              </Pressable>
            </View>
          )}

          {task.status === 'Completed' && (
            <View style={[styles.section, styles.completedBanner]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.completedText}>This task has been completed.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  headerCard: {
    backgroundColor: colors.navy,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 26,
  },
  taskCategory: {
    fontSize: 13,
    color: colors.gold,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    backgroundColor: '#FFF7E6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  notesBlock: {
    gap: 6,
    paddingTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  statusOptions: {
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statusOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#F8FAFC',
    minHeight: 80,
  },
  saveResult: {
    padding: 12,
    borderRadius: 10,
  },
  saveResultServer: {
    backgroundColor: '#DCFCE7',
  },
  saveResultLocal: {
    backgroundColor: '#FEF3C7',
  },
  saveResultError: {
    backgroundColor: '#FEE2E2',
  },
  saveResultText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  completedText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
  },
});
