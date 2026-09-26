import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import ChecklistItemCard from '../components/ChecklistItemCard';
import CustomButton from '../components/CustomButton';
import { submitInspection } from '../services/inspectionService';
import { captureGpsCoordinates } from '../services/locationService';
import { getSelectedMine, getUser } from '../services/storage';
import colors from '../theme/colors';
import type {
  ChecklistItemResult,
  InspectionRecord,
  InspectionStackParamList,
  InspectionType,
  Mine,
  User,
} from '../types';

type Props = NativeStackScreenProps<InspectionStackParamList, 'StartInspection'>;

const INSPECTION_TYPES: { value: InspectionType; label: string }[] = [
  { value: 'routine_safety_audit', label: 'Routine Safety Audit' },
  { value: 'ventilation', label: 'Ventilation Check' },
  { value: 'ppe_compliance', label: 'PPE Compliance' },
  { value: 'dust_monitoring', label: 'Dust Monitoring' },
  { value: 'equipment_safety', label: 'Equipment Safety' },
  { value: 'emergency_exits', label: 'Emergency Exits' },
];

const DEFAULT_CHECKLIST: ChecklistItemResult[] = [
  {
    id: 'ppe_compliance',
    label: 'PPE Compliance',
    description: 'Hardhats, vests, boots',
    status: 'pass',
  },
  {
    id: 'emergency_exits',
    label: 'Emergency Exit Routes',
    description: 'Clear of debris',
    status: 'pass',
  },
  {
    id: 'fire_extinguisher',
    label: 'Fire Extinguisher Readiness',
    description: 'Charged and tagged',
    status: 'pass',
  },
];

export default function StartInspectionScreen({ navigation }: Props) {
  const [mine, setMine] = useState<Mine | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [inspectionType, setInspectionType] = useState<InspectionType>('routine_safety_audit');
  const [checklistItems, setChecklistItems] = useState<ChecklistItemResult[]>(DEFAULT_CHECKLIST);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSelectedMine().then(setMine);
      getUser().then(setUser);
    }, []),
  );

  const handleChecklistChange = (index: number, updated: ChecklistItemResult) => {
    setChecklistItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
  };

  const validateChecklist = (): string | null => {
    for (const item of checklistItems) {
      if (item.status === 'partial' || item.status === 'fail') {
        if (!item.violation?.observationNotes?.trim()) {
          return `Please add observation notes for "${item.label}".`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!mine) {
      Alert.alert('Validation', 'Please select a mine before submitting.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User session not found. Please sign in again.');
      return;
    }

    const mineId = mine._id;
    const inspectorId = user.id;

    if (!mineId || !inspectorId) {
      Alert.alert('Error', 'Missing mine or inspector information. Please sign in again and reselect the mine.');
      return;
    }

    const validationError = validateChecklist();
    if (validationError) {
      Alert.alert('Validation', validationError);
      return;
    }

    let gps;
    try {
      gps = await captureGpsCoordinates();
    } catch {
      Alert.alert('Location Error', 'Unable to read your current location. Please try again.');
      return;
    }
    if (!gps) {
      Alert.alert(
        'Location Required',
        'Enable location permissions and try again so this inspection can be submitted with GPS coordinates.',
      );
      return;
    }

    setSubmitting(true);

    try {
      const record: InspectionRecord = {
        id: `insp_${Date.now()}`,
        mineId,
        mineName: mine.name,
        mineLocation: mine.location,
        inspectorId,
        inspectorName: user.name,
        inspectionType,
        checklistItems,
        gps,
        submittedAt: new Date().toISOString(),
      };

      await submitInspection(record);

      Alert.alert(
        'Inspection Submitted',
        `${INSPECTION_TYPES.find((t) => t.value === inspectionType)?.label} for ${mine.name} has been submitted to the server.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.getParent()?.navigate('HomeTab');
            },
          },
        ],
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string) ?? 'Failed to submit inspection.'
        : 'Failed to submit inspection. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!mine) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noMineText}>
          No mine selected. Please go back and select a mine.
        </Text>
        {user ? (
          <CustomButton
            title="Select Mine"
            onPress={() => navigation.navigate('SelectMine')}
            style={styles.selectMineButton}
          />
        ) : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.mineCard}>
          <Text style={styles.mineTitle}>{mine.name}</Text>
          <Text style={styles.mineDetail}>Code: {mine.code}</Text>
          <Text style={styles.mineDetail}>Location: {mine.location}</Text>
          <Text style={styles.mineDetail}>Operator: {mine.operator}</Text>
          {user ? <Text style={styles.mineDetail}>Inspector: {user.name}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Type</Text>
          <View style={styles.optionGroup}>
            {INSPECTION_TYPES.map((type) => (
              <Pressable
                key={type.value}
                style={[
                  styles.optionChip,
                  inspectionType === type.value && styles.optionChipSelected,
                ]}
                onPress={() => setInspectionType(type.value)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    inspectionType === type.value && styles.optionChipTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Checklist</Text>
          <Text style={styles.sectionSubtext}>
            Mark each item as Pass, Partial, or Fail. Partial and Fail items require violation details.
          </Text>
          {checklistItems.map((item, index) => (
            <ChecklistItemCard
              key={item.id}
              item={item}
              onChange={(updated) => handleChecklistChange(index, updated)}
            />
          ))}
        </View>

        {user ? (
          <CustomButton
            title="Submit Inspection"
            onPress={handleSubmit}
            loading={submitting}
          />
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  noMineText: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  selectMineButton: {
    alignSelf: 'stretch',
  },
  mineCard: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  mineTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },
  mineDetail: {
    fontSize: 15,
    color: colors.white,
    opacity: 0.85,
    marginBottom: 6,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  optionChipSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  optionChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: colors.white,
  },
});
