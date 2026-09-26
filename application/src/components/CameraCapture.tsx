import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import {
  captureGpsCoordinates,
  reverseGeocodeCoordinates,
} from '../services/locationService';
import colors from '../theme/colors';
import type { GeoTaggedImage } from '../types';

interface CameraCaptureProps {
  geoTaggedImage: GeoTaggedImage | null;
  onImageCaptured: (image: GeoTaggedImage) => void;
  onImageRemoved: () => void;
  label?: string;
}

interface PendingCapture {
  uri: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracyMeters?: number;
  address: string;
}

function formatGpsDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  const datePart = date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${datePart}  ${timePart}`;
}

export default function CameraCapture({
  geoTaggedImage,
  onImageCaptured,
  onImageRemoved,
  label = 'Geo-tagged Photo Evidence',
}: CameraCaptureProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const [processingWatermark, setProcessingWatermark] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const viewShotRef = useRef<ViewShotRef>(null);

  const resetModal = useCallback(() => {
    setModalVisible(false);
    setPendingCapture(null);
    setCameraReady(false);
    setCapturing(false);
    setProcessingWatermark(false);
  }, []);

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        return;
      }
    }
    setPendingCapture(null);
    setCameraReady(false);
    setModalVisible(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady || capturing) {
      return;
    }

    setCapturing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) {
        return;
      }

      const coords = await captureGpsCoordinates();
      if (!coords) {
        Alert.alert(
          'Location Required',
          'GPS coordinates could not be captured. Enable location permissions and try again.',
        );
        return;
      }

      const address = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);

      setPendingCapture({
        uri: photo.uri,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: coords.timestamp,
        accuracyMeters: coords.accuracyMeters,
        address,
      });
    } finally {
      setCapturing(false);
    }
  };

  const confirmWatermarkedPhoto = async () => {
    if (!pendingCapture || !viewShotRef.current?.capture) {
      return;
    }

    setProcessingWatermark(true);

    try {
      const watermarkedUri = await viewShotRef.current.capture();
      if (!watermarkedUri) {
        Alert.alert('Capture Failed', 'Could not generate the watermarked photo. Please try again.');
        return;
      }

      onImageCaptured({
        uri: watermarkedUri,
        latitude: pendingCapture.latitude,
        longitude: pendingCapture.longitude,
        timestamp: pendingCapture.timestamp,
        accuracyMeters: pendingCapture.accuracyMeters,
      });
      resetModal();
    } catch {
      Alert.alert('Capture Failed', 'Could not generate the watermarked photo. Please try again.');
    } finally {
      setProcessingWatermark(false);
    }
  };

  const retakePhoto = () => {
    setPendingCapture(null);
    setCameraReady(false);
  };

  const renderWatermarkPreview = () => {
    if (!pendingCapture) {
      return null;
    }

    const coordsLabel = `${pendingCapture.latitude.toFixed(6)}, ${pendingCapture.longitude.toFixed(6)}`;
    const dateTimeLabel = formatGpsDateTime(pendingCapture.timestamp);

    return (
      <View style={styles.previewScreen}>
        <ViewShot
          ref={viewShotRef}
          style={styles.viewShot}
          options={{ format: 'jpg', quality: 0.9 }}
        >
          <Image source={{ uri: pendingCapture.uri }} style={styles.watermarkPhoto} />
          <View style={styles.watermarkOverlay}>
            <Text style={styles.watermarkAddress}>{pendingCapture.address}</Text>
            <Text style={styles.watermarkMeta}>{coordsLabel}</Text>
            <Text style={styles.watermarkMeta}>{dateTimeLabel}</Text>
          </View>
        </ViewShot>

        <View style={styles.previewActionsBar}>
          <Pressable style={styles.previewActionButton} onPress={retakePhoto} disabled={processingWatermark}>
            <Ionicons name="camera-outline" size={22} color={colors.white} />
            <Text style={styles.previewActionText}>Retake</Text>
          </Pressable>

          <Pressable
            style={[styles.confirmButton, processingWatermark && styles.confirmButtonDisabled]}
            onPress={confirmWatermarkedPhoto}
            disabled={processingWatermark}
          >
            {processingWatermark ? (
              <ActivityIndicator color={colors.navy} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color={colors.navy} />
                <Text style={styles.confirmButtonText}>Use Photo</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {geoTaggedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: geoTaggedImage.uri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <Pressable style={styles.retakeButton} onPress={openCamera}>
              <Ionicons name="camera-outline" size={18} color={colors.navy} />
              <Text style={styles.retakeText}>Retake</Text>
            </Pressable>
            <Pressable style={styles.removeButton} onPress={onImageRemoved}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={styles.captureButton} onPress={openCamera}>
          <Ionicons name="camera" size={28} color={colors.navy} />
          <Text style={styles.captureText}>Capture Geo-tagged Photo</Text>
        </Pressable>
      )}

      <Modal visible={modalVisible} animationType="slide" onRequestClose={resetModal}>
        <View style={styles.modalContainer}>
          {pendingCapture ? (
            renderWatermarkPreview()
          ) : (
            <>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                onCameraReady={() => setCameraReady(true)}
              />
              <View style={styles.modalControls}>
                <Pressable style={styles.modalClose} onPress={resetModal}>
                  <Ionicons name="close" size={28} color={colors.white} />
                </Pressable>
                <Pressable
                  style={[styles.shutterButton, (!cameraReady || capturing) && styles.shutterDisabled]}
                  onPress={handleCapture}
                  disabled={!cameraReady || capturing}
                >
                  {capturing ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <View style={styles.shutterInner} />
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 20,
    backgroundColor: colors.background,
  },
  captureText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
  },
  previewContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  preview: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retakeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  camera: {
    flex: 1,
  },
  modalControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
    paddingTop: 20,
    backgroundColor: 'rgba(11, 25, 44, 0.6)',
  },
  modalClose: {
    position: 'absolute',
    left: 24,
    bottom: 56,
    padding: 8,
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
  },
  previewScreen: {
    flex: 1,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  viewShot: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  watermarkPhoto: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  watermarkOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  watermarkAddress: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  watermarkMeta: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  previewActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  previewActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  previewActionText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '700',
  },
});
