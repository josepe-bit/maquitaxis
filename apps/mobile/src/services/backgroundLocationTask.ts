import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from './supabase';
import { gpsFilterService } from './gpsFilter';
import { GPSPosition, STORAGE_KEYS } from '@maquitaxis/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_LOCATION_TASK_NAME = 'MAQUITAXIS_BACKGROUND_LOCATION_TASK';

interface BackgroundTaskData {
  locations?: Location.LocationObject[];
}

let lastBgRecordedPosition: GPSPosition | null = null;
let currentBgSessionId: string | null = null;
let currentBgVehiculoId: string | null = null;
let lastBgDbGpsPositionTime: number = 0;

export const setBackgroundTrackingParams = (sessionId: string, vehiculoId: string) => {
  currentBgSessionId = sessionId;
  currentBgVehiculoId = vehiculoId;
  lastBgRecordedPosition = null;
  lastBgDbGpsPositionTime = 0;
  AsyncStorage.setItem(
    STORAGE_KEYS.ACTIVE_SESSION,
    JSON.stringify({ sessionId, vehiculoId })
  ).catch(() => {});
};

export const clearBackgroundTrackingParams = () => {
  currentBgSessionId = null;
  currentBgVehiculoId = null;
  lastBgRecordedPosition = null;
  lastBgDbGpsPositionTime = 0;
  AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION).catch(() => {});
};

// Definir la tarea en segundo plano usando TaskManager
TaskManager.defineTask<BackgroundTaskData>(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data || !data.locations || data.locations.length === 0) {
    return;
  }

  // Si las variables en memoria se perdieron tras la suspensión del runtime JS por el SO,
  // intentar recuperar la sesión activa persistida en AsyncStorage
  if (!currentBgSessionId || !currentBgVehiculoId) {
    try {
      const rawActive = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (rawActive) {
        const parsed = JSON.parse(rawActive);
        if (parsed?.sessionId && parsed?.vehiculoId) {
          currentBgSessionId = parsed.sessionId;
          currentBgVehiculoId = parsed.vehiculoId;
        }
      }
    } catch {
      // Ignorar error de lectura de AsyncStorage
    }
  }

  if (!currentBgSessionId || !currentBgVehiculoId) {
    return;
  }

  const location = data.locations[data.locations.length - 1];
  const { latitude, longitude, altitude, speed, heading, accuracy } = location.coords;
  const timestampIso = new Date(location.timestamp).toISOString();

  // Evaluar posición con el filtro inteligente de Haversine y liveness
  const filterResult = gpsFilterService.shouldRecordPosition(
    lastBgRecordedPosition,
    latitude,
    longitude,
    accuracy || undefined
  );

  if (!filterResult.shouldRecord) {
    return;
  }

  const bgPosition: GPSPosition = {
    sessionId: currentBgSessionId,
    vehiculoId: currentBgVehiculoId,
    latitude,
    longitude,
    altitude: altitude || undefined,
    speed: speed || undefined,
    heading: heading || undefined,
    accuracy: accuracy || undefined,
    timestamp: timestampIso,
  };

  lastBgRecordedPosition = bgPosition;

  try {
    const now = Date.now();
    const isMovement = filterResult.isMovement ?? true;
    const shouldInsertHistory = isMovement || !lastBgDbGpsPositionTime || (now - lastBgDbGpsPositionTime >= 5 * 60 * 1000);

    // 1. Insertar en gps_positions si hubo desplazamiento (>=15m) o pasaron 5 min (evita saturar la tabla en reposo)
    if (shouldInsertHistory) {
      await supabase.from('gps_positions').insert({
        session_id: bgPosition.sessionId,
        vehiculo_id: bgPosition.vehiculoId,
        latitude: bgPosition.latitude,
        longitude: bgPosition.longitude,
        altitude: bgPosition.altitude,
        speed: bgPosition.speed,
        heading: bgPosition.heading,
        accuracy: bgPosition.accuracy,
        recorded_at: bgPosition.timestamp,
      });
      lastBgDbGpsPositionTime = now;
    }

    // 2. SIEMPRE actualizar última posición del vehículo (Heartbeat a Supabase Realtime)
    await supabase
      .from('vehiculos')
      .update({
        last_known_lat: bgPosition.latitude,
        last_known_lng: bgPosition.longitude,
        last_location_at: bgPosition.timestamp,
        status: 'en_servicio',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bgPosition.vehiculoId);
  } catch {
    // Guardar en cola offline en caso de fallo de red
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_GPS_QUEUE);
      const queue: GPSPosition[] = raw ? JSON.parse(raw) : [];
      queue.push({ ...bgPosition, isSynced: false });
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_GPS_QUEUE, JSON.stringify(queue));
    } catch {
      // Ignorar errores de almacenamiento local
    }
  }
});
