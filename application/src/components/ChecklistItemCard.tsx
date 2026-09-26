import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CameraCapture from './CameraCapture';
import colors from '../theme/colors';
import type {
  ChecklistItemResult,
  ComplianceStatus,
  GeoTaggedImage,
  SeverityLevel,
} from '../types';

const COMPLIANCE_OPTIONS: { value: ComplianceStatus; label: string; color: string; bg: string }[] = [
  { value: 'pass', label: 'Pass', color: colors.success, bg: '#E3F9E5' },
  { value: 'partial', label: 'Partial', color: colors.gold, bg: '#FFF8E1' },
  { value: 'fail', label: 'Fail', color: colors.error, bg: '#FFE3E3' },
];

const SEVERITY_OPTIONS: SeverityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function severityColor(level: SeverityLevel): string {
  switch (level) {
    case 'LOW':
      return colors.textSecondary;
    case 'MEDIUM':
      return colors.gold;
    case 'HIGH':
      return '#E27A00';
    case 'CRITICAL':
      return colors.error;
  }
}

interface ChecklistItemCardProps {
  item: ChecklistItemResult;
  onChange: (updated: ChecklistItemResult) => void;
}

export default function ChecklistItemCard({ item, onChange }: ChecklistItemCardProps) {
  const showViolationForm = item.status === 'partial' || item.status === 'fail';

  const updateViolation = (
    field: keyof NonNullable<ChecklistItemResult['violation']>,
    value: string | GeoTaggedImage | undefined,
  ) => {
    onChange({
      ...item,
      violation: {
        observationNotes: item.violation?.observationNotes ?? '',
        severity: item.violation?.severity ?? 'MEDIUM',
        geoTaggedImage: item.violation?.geoTaggedImage,
        [field]: value,
      },
    });
  };

  const handleStatusChange = (status: ComplianceStatus) => {
    if (status === 'pass') {
      onChange({ ...item, status, violation: undefined });
    } else {
      onChange({
        ...item,
        status,
        violation: item.violation ?? {
          observationNotes: '',
          severity: 'MEDIUM',
        },
      });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.gold} />
        <View style={styles.headerText}>
          <Text style={styles.title}>{item.label}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.statusGroup}>
        {COMPLIANCE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.statusOption,
              item.status === option.value && {
                borderColor: option.color,
                backgroundColor: option.bg,
                borderWidth: 2,
              },
            ]}
            onPress={() => handleStatusChange(option.value)}
          >
            <Text
              style={[
                styles.statusText,
                item.status === option.value && { color: option.color, fontWeight: '700' },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {showViolationForm ? (
        <View style={styles.violationForm}>
          <Text style={styles.violationTitle}>Violation Details</Text>

          <Text style={styles.fieldLabel}>Observation Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={item.violation?.observationNotes ?? ''}
            onChangeText={(text) => updateViolation('observationNotes', text)}
            placeholder="Describe the issue observed..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.fieldLabel}>Severity</Text>
          <View style={styles.severityGroup}>
            {SEVERITY_OPTIONS.map((level) => (
              <Pressable
                key={level}
                style={[
                  styles.severityChip,
                  item.violation?.severity === level && {
                    backgroundColor: severityColor(level),
                    borderColor: severityColor(level),
                  },
                ]}
                onPress={() => updateViolation('severity', level)}
              >
                <Text
                  style={[
                    styles.severityText,
                    item.violation?.severity === level && styles.severityTextSelected,
                  ]}
                >
                  {level}
                </Text>
              </Pressable>
            ))}
          </View>

          <CameraCapture
            geoTaggedImage={item.violation?.geoTaggedImage ?? null}
            onImageCaptured={(image) => updateViolation('geoTaggedImage', image)}
            onImageRemoved={() => updateViolation('geoTaggedImage', undefined)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  violationForm: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  violationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    minHeight: 72,
    marginBottom: 12,
    backgroundColor: colors.background,
  },
  severityGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  severityChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  severityTextSelected: {
    color: colors.white,
  },
});
