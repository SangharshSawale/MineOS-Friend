import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import CameraCapture from '../components/CameraCapture';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import { submitHazardReport } from '../services/hazardService';
import { captureGpsCoordinates } from '../services/locationService';
import { fetchMines } from '../services/mineService';
import { getSelectedMine, getUser, saveSelectedMine } from '../services/storage';
import colors from '../theme/colors';
import type { GeoTaggedImage, GpsCoordinates, HazardStackParamList, Mine, User } from '../types';

type Props = NativeStackScreenProps<HazardStackParamList, 'HazardReport'>;

export default function HazardReportScreen({ navigation }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [mines, setMines] = useState<Mine[]>([]);
  const [selectedMine, setSelectedMine] = useState<Mine | null>(null);
  const [minesLoading, setMinesLoading] = useState(true);
  const [minePickerVisible, setMinePickerVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [geoTaggedImage, setGeoTaggedImage] = useState<GeoTaggedImage | null>(null);
  const [gps, setGps] = useState<GpsCoordinates | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const goToTab = useCallback(
    (tab: 'HomeTab' | 'ProfileTab') => {
      navigation.getParent()?.navigate(tab);
    },
    [navigation],
  );

  // A hazard report is a top-level tab, so Android Back should return to Home
  // instead of closing the app.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goToTab('HomeTab');
        return true;
      });

      return () => subscription.remove();
    }, [goToTab]),
  );

  useEffect(() => {
    let isMounted = true;

    Promise.all([getUser(), getSelectedMine(), fetchMines()])
      .then(([currentUser, savedMine, availableMines]) => {
        if (!isMounted) {
          return;
        }

        const activeMines = availableMines.filter((mine) => mine.status === 'active');
        setUser(currentUser);
        setMines(activeMines);
        setSelectedMine(activeMines.find((mine) => mine._id === savedMine?._id) ?? null);
      })
      .catch((err) => {
        if (!isMounted) {
          return;
        }
        setUser(null);
        setMines([]);
        const message = axios.isAxiosError(err)
          ? (err.response?.data?.message as string) ?? 'Failed to load available mines.'
          : 'Failed to load available mines.';
        Alert.alert('Mine Selection Unavailable', message);
      })
      .finally(() => {
        if (isMounted) {
          setMinesLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadGps = useCallback(async () => {
    setGpsLoading(true);
    const coords = await captureGpsCoordinates();
    setGps(coords);
    setGpsLoading(false);
  }, []);

  useEffect(() => {
    loadGps();
  }, [loadGps]);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Validation', 'Please describe the hazard you observed.');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User session not found. Please sign in again.');
      return;
    }

    if (!selectedMine) {
      Alert.alert('Mine Required', 'Select the mine where you observed the hazard before submitting.');
      return;
    }

    const locationData = geoTaggedImage ?? gps;
    if (!locationData) {
      Alert.alert(
        'Location Required',
        'GPS coordinates are required for hazard reports. Please enable location permissions and try again.',
        [{ text: 'Retry', onPress: loadGps }],
      );
      return;
    }

    setSubmitting(true);

    try {
      await submitHazardReport({
        description: description.trim(),
        geoTaggedImage: geoTaggedImage ?? undefined,
        gps: geoTaggedImage ? undefined : gps ?? undefined,
        mineId: selectedMine._id,
      });

      Alert.alert(
        'Hazard Report Submitted',
        'Your geo-tagged incident is now in the shared portal case register for officer review and closure.',
        [{ text: 'OK', onPress: () => goToTab('HomeTab') }],
      );
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message as string) ?? 'Failed to submit hazard report.'
        : err instanceof Error
          ? err.message
          : 'Failed to submit hazard report.';
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const activeGps = geoTaggedImage ?? gps;

  const handleMineSelect = async (mine: Mine) => {
    await saveSelectedMine(mine);
    setSelectedMine(mine);
    setMinePickerVisible(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Ionicons name="warning" size={32} color={colors.gold} />
          <Text style={styles.headerTitle}>Quick Hazard Report</Text>
          <Text style={styles.headerSubtext}>
            Report a safety hazard immediately. Your geo-tagged photo and location will be attached.
          </Text>
        </View>

        <View style={styles.section}>
          <CustomInput
            label="Hazard Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the hazard, its location, and any immediate risks..."
            multiline
            numberOfLines={5}
            style={styles.descriptionInput}
            textAlignVertical="top"
          />

          <View style={styles.mineField}>
            <Text style={styles.mineLabel}>Mine where this hazard was observed *</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select mine for hazard report"
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
                  {minesLoading ? 'Loading available mines...' : selectedMine?.name ?? 'Select an active mine'}
                </Text>
                {selectedMine ? (
                  <Text style={styles.mineDetails}>{selectedMine.code} · {selectedMine.location}</Text>
                ) : null}
              </View>
              {minesLoading ? (
                <ActivityIndicator color={colors.navy} />
              ) : (
                <Ionicons name="chevron-down" size={22} color={colors.navy} />
              )}
            </Pressable>
          </View>

          <CameraCapture
            geoTaggedImage={geoTaggedImage}
            onImageCaptured={(image) => {
              setGeoTaggedImage(image);
              setGps({
                latitude: image.latitude,
                longitude: image.longitude,
                timestamp: image.timestamp,
              });
            }}
            onImageRemoved={() => setGeoTaggedImage(null)}
            label="Geo-tagged Photo Evidence (Optional)"
          />

          <View style={styles.gpsCard}>
            <View style={styles.gpsHeader}>
              <Ionicons name="location" size={20} color={colors.navy} />
              <Text style={styles.gpsTitle}>GPS Location</Text>
            </View>
            {geoTaggedImage ? (
              <>
                <Text style={styles.gpsText}>
                  Lat: {geoTaggedImage.latitude.toFixed(6)} · Lng: {geoTaggedImage.longitude.toFixed(6)}
                </Text>
                <Text style={styles.gpsTimestamp}>
                  Embedded in geo-tagged photo · {new Date(geoTaggedImage.timestamp).toLocaleString()}
                </Text>
              </>
            ) : gpsLoading ? (
              <Text style={styles.gpsText}>Capturing coordinates...</Text>
            ) : activeGps ? (
              <>
                <Text style={styles.gpsText}>
                  Lat: {activeGps.latitude.toFixed(6)} · Lng: {activeGps.longitude.toFixed(6)}
                </Text>
                <Text style={styles.gpsTimestamp}>
                  Captured at {new Date(activeGps.timestamp).toLocaleString()}
                </Text>
              </>
            ) : (
              <Text style={styles.gpsError}>
                Location unavailable. Tap retry to capture GPS.
              </Text>
            )}
            {!geoTaggedImage && !gpsLoading && !gps ? (
              <CustomButton
                title="Retry GPS Capture"
                onPress={loadGps}
                variant="secondary"
                style={styles.retryButton}
              />
            ) : null}
          </View>
        </View>

        <CustomButton
          title="Submit Hazard Report"
          onPress={handleSubmit}
          loading={submitting}
        />
      </ScrollView>

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
                <Text style={styles.modalTitle}>Select Mine</Text>
                <Text style={styles.modalSubtitle}>Choose where this hazard was observed.</Text>
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
  },
  headerCard: {
    backgroundColor: colors.navy,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
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
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  mineField: {
    marginBottom: 16,
  },
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
  gpsCard: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  gpsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  gpsText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  gpsTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  gpsError: {
    fontSize: 13,
    color: colors.error,
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 4,
  },
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
