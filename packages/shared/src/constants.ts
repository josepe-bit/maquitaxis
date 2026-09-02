import { GPSConfig } from './types';

/**
 * Configuración por defecto para el motor GPS
 */
export const DEFAULT_GPS_CONFIG: GPSConfig = {
  minDistanceMeters: 15,
  maxIntervalSeconds: 30,
  minAccuracyMeters: 30,
};

/**
 * Nombre del canal de Supabase Realtime para posiciones de taxis
 */
export const REALTIME_TAXI_CHANNEL = 'taxi_locations_realtime';

/**
 * Claves de almacenamiento local (AsyncStorage / LocalStorage)
 */
export const STORAGE_KEYS = {
  OFFLINE_GPS_QUEUE: '@maquitaxis:offline_gps_queue',
  AUTH_SESSION: '@maquitaxis:auth_session',
  ACTIVE_SESSION: '@maquitaxis:active_gps_session',
};
