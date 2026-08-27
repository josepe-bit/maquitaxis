import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { gpsFilterService } from './gpsFilter';
import { GPSPosition, STORAGE_KEYS } from '@maquitaxis/shared';
import {
  BACKGROUND_LOCATION_TASK_NAME,
  setBackgroundTrackingParams,
} from './backgroundLocationTask';

export interface LocationUpdateHandler {
  (position: GPSPosition, reason: string): void;
}

class LocationService {
  private locationSubscription: Location.LocationSubscription | null = null;
  private lastRecordedPosition: GPSPosition | null = null;
  private currentSessionId: string | null = null;
  private currentVehiculoId: string | null = null;
  private updateListeners: LocationUpdateHandler[] = [];

  /**
   * Solicita permisos de ubicación en primer plano y segundo plano
   */
  async requestPermissions(): Promise<boolean> {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      return false;
    }

    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      return bgStatus === 'granted';
    } catch {
      // En entorno de prueba o simulador donde background permission difiera, retornar verdadero si foreground fue concedido
      return true;
    }
  }

  /**
   * Suscribirse a cambios de ubicación emitidos
   */
  onLocationUpdate(listener: LocationUpdateHandler): () => void {
    this.updateListeners.push(listener);
    return () => {
      this.updateListeners = this.updateListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Iniciar captura de ubicación para una sesión de seguimiento activa
   */
  async startTracking(sessionId: string, vehiculoId: string): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Permisos de localización GPS denegados por el usuario.');
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    this.currentSessionId = sessionId;
    this.currentVehiculoId = vehiculoId;
    this.lastRecordedPosition = null;

    setBackgroundTrackingParams(sessionId, vehiculoId);

    // 1. Suscribirse a cambios de posición del GPS nativo en primer plano
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Comprobar sensor cada 5 segundos
        distanceInterval: 5,  // Notificar al sensor cada 5 metros
      },
      (location) => this.handleIncomingLocation(location)
    );

    // 2. Iniciar seguimiento nativo en segundo plano si está disponible
    try {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
      if (!isRegistered) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 10,
          foregroundService: {
            notificationTitle: '🚕 MaquiTaxis GPS Activo',
            notificationBody: 'Transmitiendo posición del taxi en servicio.',
            notificationColor: '#f59e0b',
          },
        });
      }
    } catch {
      // Ignorar si el simulador o entorno no admite background updates
    }

    return true;
  }

  /**
   * Procesar la lectura geofísica entrante desde el sensor
   */
  private async handleIncomingLocation(location: Location.LocationObject): Promise<void> {
    if (!this.currentSessionId || !this.currentVehiculoId) return;

    const { latitude, longitude, altitude, speed, heading, accuracy } = location.coords;
    const timestampIso = new Date(location.timestamp).toISOString();

    // Evaluar la posición mediante la Estrategia de Filtrado Inteligente
    const filterResult = gpsFilterService.shouldRecordPosition(
      this.lastRecordedPosition,
      latitude,
      longitude,
      accuracy || undefined
    );

    if (!filterResult.shouldRecord) {
      return;
    }

    const newGpsPosition: GPSPosition = {
      sessionId: this.currentSessionId,
      vehiculoId: this.currentVehiculoId,
      latitude,
      longitude,
      altitude: altitude || undefined,
      speed: speed || undefined,
      heading: heading || undefined,
      accuracy: accuracy || undefined,
      timestamp: timestampIso,
    };

    // Actualizar referencia en memoria
    this.lastRecordedPosition = newGpsPosition;

    // Notificar a los suscriptores UI (DriverHomeScreen)
    this.updateListeners.forEach((listener) => listener(newGpsPosition, filterResult.reason));

    // Enviar a Supabase PostgreSQL (o guardar en cola local offline)
    await this.persistGpsPosition(newGpsPosition);
  }

  /**
   * Guardar la posición en Supabase y actualizar la posición actual del taxi
   */
  private async persistGpsPosition(position: GPSPosition): Promise<void> {
    try {
      // 1. Insertar lectura en gps_positions
      const { error: insertError } = await supabase.from('gps_positions').insert({
        session_id: position.sessionId,
        vehiculo_id: position.vehiculoId,
        latitude: position.latitude,
        longitude: position.longitude,
        altitude: position.altitude,
        speed: position.speed,
        heading: position.heading,
        accuracy: position.accuracy,
        recorded_at: position.timestamp,
      });

      if (insertError) {
        throw insertError;
      }

      // 2. Actualizar última ubicación en la tabla vehiculos
      await supabase
        .from('vehiculos')
        .update({
          last_known_lat: position.latitude,
          last_known_lng: position.longitude,
          last_location_at: position.timestamp,
          status: 'en_servicio',
          updated_at: new Date().toISOString(),
        })
        .eq('id', position.vehiculoId);

      // Sincronizar cola de respaldos offline si existieran
      await this.flushOfflineQueue();
    } catch {
      // Si falla la conexión a red, respaldar en AsyncStorage local
      await this.saveToOfflineQueue(position);
    }
  }

  /**
   * Guardar en cola local offline (AsyncStorage)
   */
  private async saveToOfflineQueue(position: GPSPosition): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_GPS_QUEUE);
      const queue: GPSPosition[] = raw ? JSON.parse(raw) : [];
      queue.push({ ...position, isSynced: false });
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_GPS_QUEUE, JSON.stringify(queue));
    } catch {
      // Ignorar errores de almacenamiento local
    }
  }

  /**
   * Procesar y sincronizar elementos pendientes de la cola offline al recuperar red
   */
  private async flushOfflineQueue(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_GPS_QUEUE);
      if (!raw) return;

      const queue: GPSPosition[] = JSON.parse(raw);
      if (queue.length === 0) return;

      const batch = queue.map((p) => ({
        session_id: p.sessionId,
        vehiculo_id: p.vehiculoId,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        speed: p.speed,
        heading: p.heading,
        accuracy: p.accuracy,
        recorded_at: p.timestamp,
      }));

      const { error } = await supabase.from('gps_positions').insert(batch);
      if (!error) {
        await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_GPS_QUEUE);
      }
    } catch {
      // Continuar silenciosamente
    }
  }

  /**
   * Detener la captura GPS
   */
  async stopTracking(): Promise<void> {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    try {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
      }
    } catch {
      // Ignorar errores al detener la tarea
    }

    this.currentSessionId = null;
    this.currentVehiculoId = null;
    this.lastRecordedPosition = null;
  }
}

export const locationService = new LocationService();
