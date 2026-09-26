import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import CameraCapture from '../components/CameraCapture';
import CustomButton from '../components/CustomButton';
import { submitAttendanceCheckIn, type AttendanceCheckInResult } from '../services/attendanceService';
import { fetchMines } from '../services/mineService';
import { getSelectedMine, saveSelectedMine } from '../services/storage';
import colors from '../theme/colors';
import type { GeoTaggedImage, Mine, ProfileStackParamList } from '../types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'AttendanceCheckIn'>;

const VERIFICATION_CONFIG: Record<string, { icon: 'checkmark-circle' | 'time' | 'close-circle'; color: string; label: string }> = {
  AUTO_VERIFIED: { icon: 'checkmark-circle', color: colors.success, label: 'Auto-Verified ✓' },
  MANUAL_REVIEW: { icon: 'time', color: '#F59E0B', label: 'Pending Review' },
  REJECTED: { icon: 'close-circle', color: colors.error, label: 'Rejected' },
};

export default function AttendanceCheckInScreen({ navigation }: Props) {
  const [geoTaggedImage, setGeoTaggedImage] = useState<GeoTaggedImage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttendanceCheckInResult | null>(null);

  // Mine selection state
  const [mines, setMines] = useState<Mine[]>([]);
  const [selectedMine, setSelectedMine] = useState<Mine | null>(null);
  const [minesLoading, setMinesLoading] = useState(true);
  const [minePickerVisible, setMinePickerVisible] = useState(false);

  // Fetch mine list and restore the previously saved mine on mount
  useEffect(() => {
    let isMounted = true;

    Promise.all([getSelectedMine(), fetchMines()])
      .then(([savedMine, availableMines]) => {
        if (!isMounted) return;
        const activeMines = availableMines.filter((mine) => mine.status === 'active');
        setMines(activeMines);
        // Restore saved mine only if it is still active
        setSelectedMine(activeMines.find((mine) => mine._id === savedMine?._id) ?? null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setMines([]);
        const message = axios.isAxiosError(err)
          ? (err.response?.data?.message as string) ?? 'Failed to load available mines.'
          : 'Failed to load available mines.';
        Alert.alert('Mine Selection Unavailable', message);
      })
      .finally(() => {
        if (isMounted) setMinesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMineSelect = async (mine: Mine) => {
    await saveSelectedMine(mine);
    setSelectedMine(mine);
    setMinePickerVisible(false);
  };

  const handleSubmit = async () => {
    if (!selectedMine) {
      Alert.alert('Mine Required', 'Please select your Mine / Colliery before checking in.');
      return;
    }

    if (!geoTaggedImage) {
      Alert.alert('Photo Required', 'Please capture a geo-tagged attendance photo before checking in.');
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await submitAttendanceCheckIn(geoTaggedImage, selectedMine._id);
      setResult(res);

      const verStatus = res.verificationStatus ?? res.status ?? 'MANUAL_REVIEW';
      const serverMessage = res.message ?? 'Your attendance has been submitted.';

      if (verStatus === 'REJECTED') {
        Alert.alert('Check-In Rejected', serverMessage, [{ text: 'OK' }]);
      } else if (verStatus === 'AUTO_VERIFIED') {
        Alert.alert(
          'Check-In Verified ✓',
          serverMessage,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert(
          'Check-In Submitted',
          serverMessage,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string) ?? 'Failed to submit attendance check-in.'
        : err instanceof Error
          ? err.message
          : 'Failed to submit attendance check-in.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const verStatus = result?.verificationStatus ?? result?.status;
  const verConfig = verStatus ? VERIFICATION_CONFIG[verStatus] : null;

  // Both a mine AND a photo are required before the button becomes active.
  const canSubmit = Boolean(selectedMine && geoTaggedImage);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Ionicons name="camera" size={32} color={colors.gold} />
          <Text style={styles.headerTitle}>Attendance Check-In</Text>
          <Text style={styles.headerSubtext}>
            Select your mine and capture a live geo-tagged photo. Your GPS coordinates will be
            verified against the mine geofence automatically.
          </Text>
        </View>

        {/* ── Mine / Colliery selector ── */}
        <View style={styles.section}>
          <View style={styles.mineField}>
            <Text style={styles.mineLabel}>Mine / Colliery *</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select mine for attendance check-in"
              onPress={() => setMinePickerVisible(true)}
              disabled={minesLoading}
              style={({ pressed }) => [
                styles.minePicker,
                !selectedMine && styles.minePickerRequired,
                pressed && !minesLoading && styles.minePickerPressed,
                minesLoading && styles.minePickerDisabled,
              ]}
            >
              <View style={styles.minePickerText}>
                <Text style={selectedMine ? styles.mineName : styles.minePlaceholder}>
                  {minesLoading
                    ? 'Loading available mines…'
                    : selectedMine?.name ?? 'Select your mine or colliery'}
                </Text>
                {selectedMine ? (
                  <Text style={styles.mineDetails}>
                    {selectedMine.code} · {selectedMine.location}
                  </Text>
                ) : null}
              </View>
              {minesLoading ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Ionicons name="chevron-down" size={22} color={colors.navy} />
              )}
            </Pressable>
          </View>
        </View>

        {/* ── Camera & GPS card ── */}
        <View style={styles.section}>
          <CameraCapture
            geoTaggedImage={geoTaggedImage}
            onImageCaptured={setGeoTaggedImage}
            onImageRemoved={() => setGeoTaggedImage(null)}
            label="Geo-tagged Attendance Photo"
          />

          {geoTaggedImage ? (
            <View style={styles.gpsCard}>
              <View style={styles.gpsHeader}>
                <Ionicons name="location" size={20} color={colors.navy} />
                <Text style={styles.gpsTitle}>Captured Location</Text>
              </View>
              <Text style={styles.gpsText}>
                Lat: {geoTaggedImage.latitude.toFixed(6)} · Lng: {geoTaggedImage.longitude.toFixed(6)}
              </Text>
              {geoTaggedImage.accuracyMeters !== undefined && (
                <Text style={styles.gpsAccuracy}>
                  GPS Accuracy: ±{Math.round(geoTaggedImage.accuracyMeters)}m
                  {geoTaggedImage.accuracyMeters > 200 ? ' — Low accuracy, may require review' : ''}
                </Text>
              )}
              <Text style={styles.gpsTimestamp}>
                {new Date(geoTaggedImage.timestamp).toLocaleString()}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Validation hint ── */}
        {!canSubmit && (
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.hintText}>
              {!selectedMine
                ? 'Select a Mine / Colliery above to continue.'
                : 'Capture a geo-tagged photo to enable check-in.'}
            </Text>
          </View>
        )}

        {/* Verification result card */}
        {result && verConfig && (
          <View style={[styles.resultCard, { borderColor: verConfig.color }]}>
            <Ionicons name={verConfig.icon} size={28} color={verConfig.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.resultStatus, { color: verConfig.color }]}>{verConfig.label}</Text>
              {result.distanceFromMine !== undefined && (
                <Text style={styles.resultDetail}>
                  Distance from mine: {result.distanceFromMine}m
                </Text>
              )}
              {result.message ? (
                <Text style={styles.resultMessage}>{result.message}</Text>
              ) : null}
            </View>
          </View>
        )}

        <CustomButton
          title="Submit Attendance Check-In"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!canSubmit}
        />
      </ScrollView>

      {/* ── Mine picker bottom sheet ── */}
      <Modal
        visible={minePickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMinePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Mine / Colliery</Text>
                <Text style={styles.modalSubtitle}>Choose the site you are checking in at.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close mine selection"
                onPress={() => setMinePickerVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <FlatList
              data={mines}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleMineSelect(item)}
                  style={({ pressed }) => [
                    styles.mineOption,
                    selectedMine?._id === item._id && styles.mineOptionSelected,
                    pressed && styles.mineOptionPressed,
                  ]}
                >
                  <View style={styles.mineOptionText}>
                    <Text style={styles.mineOptionName}>{item.name}</Text>
                    <Text style={styles.mineOptionDetails}>{item.code} · {item.location}</Text>
                    <Text style={styles.mineOptionOperator}>{item.operator}</Text>
                  </View>
                  {selectedMine?._id === item._id ? (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  ) : null}
                </Pressable>
              )}
              contentContainerStyle={styles.mineOptionsList}
              ListEmptyComponent={
                <Text style={styles.emptyMinesText}>No active mines are currently available.</Text>
              }
            />
          </View>
        </View>
      </Modal>
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
    gap: 16,
  },
  headerCard: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginTop: 10,
    marginBottom: 6,
  },
  headerSubtext: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  // Mine picker field
  mineField: {},
  mineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  minePicker: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  minePickerRequired: {
    borderColor: colors.gold,
  },
  minePickerPressed: {
    opacity: 0.8,
  },
  minePickerDisabled: {
    opacity: 0.65,
  },
  minePickerText: {
    flex: 1,
    marginRight: 8,
  },
  mineName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  minePlaceholder: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  mineDetails: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  // GPS card
  gpsCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  gpsText: {
    fontSize: 13,
    color: colors.text,
  },
  gpsAccuracy: {
    fontSize: 12,
    color: '#D97706',
    fontStyle: 'italic',
  },
  gpsTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Hint banner
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Verification result card
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  resultStatus: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  resultMessage: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  // Mine picker modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalSheet: {
    maxHeight: '78%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  modalClose: {
    padding: 6,
  },
  mineOptionsList: {
    padding: 16,
  },
  mineOption: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mineOptionSelected: {
    borderColor: colors.success,
    backgroundColor: '#E3F9E5',
  },
  mineOptionPressed: {
    opacity: 0.8,
  },
  mineOptionText: {
    flex: 1,
    marginRight: 8,
  },
  mineOptionName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  mineOptionDetails: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  mineOptionOperator: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyMinesText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 28,
  },
});
