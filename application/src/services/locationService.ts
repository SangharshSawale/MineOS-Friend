import * as Location from 'expo-location';
import type { GpsCoordinates } from '../types';

export function formatGpsAddress(address: Location.LocationGeocodedAddress): string {
  const parts = [
    address.name,
    address.street,
    address.city ?? address.subregion,
    address.region,
    address.postalCode,
    address.country,
  ].filter((part) => part && part.trim().length > 0);

  return parts.join(', ') || 'Unknown location';
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length === 0) {
      return 'Unknown location';
    }
    return formatGpsAddress(results[0]);
  } catch {
    return 'Unknown location';
  }
}

export async function captureGpsCoordinates(): Promise<GpsCoordinates | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: new Date().toISOString(),
    ...(typeof position.coords.accuracy === 'number'
      ? { accuracyMeters: position.coords.accuracy }
      : {}),
  };
}
