import { useState, useEffect, useRef, useCallback } from 'react';
import { AuthDriverState } from '../services/auth';
import { trackingSessionService } from '../services/trackingSession';
import { locationService } from '../services/locationService';
import { gpsFilterService } from '../services/gpsFilter';
import { TrackingSession, GPSPosition } from '@maquitaxis/shared';

interface UseTaxiTrackingProps {
  authData: AuthDriverState;
}

export function useTaxiTracking({ authData }: UseTaxiTrackingProps) {
  const { tercero, vehiculo } = authData;

  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<TrackingSession | null>(null);
  const [currentLocation, setCurrentLocation] = useState<GPSPosition | null>(null);
  const [totalDistanceMeters, setTotalDistanceMeters] = useState<number>(0);
  const [totalPositionsCount, setTotalPositionsCount] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [filterReason, setFilterReason] = useState<string>('Esperando servicio');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const prevLocationRef = useRef<GPSPosition | null>(null);
  const distanceRef = useRef<number>(0);
  const positionsCountRef = useRef<number>(0);

  // 1. Al montar el hook, intentar recuperar una sesión activa si el vehículo ya estaba en servicio
  useEffect(() => {
    let isMounted = true;

    const checkAndRecoverSession = async () => {
      if (!vehiculo?.id) return;
      try {
        const session = await trackingSessionService.getActiveSession(vehiculo.id, tercero.id);
        if (session && isMounted) {
          setActiveSession(session);
          setTotalDistanceMeters(session.totalDistanceMeters || 0);
          setTotalPositionsCount(session.totalPositionsCount || 0);
          distanceRef.current = session.totalDistanceMeters || 0;
          positionsCountRef.current = session.totalPositionsCount || 0;

          // Re-iniciar seguimiento GPS automáticamente para la sesión recuperada
          await locationService.startTracking(session.id, vehiculo.id);
          setIsTracking(true);
          setLastUpdateTime(new Date().toLocaleTimeString());
          setFilterReason('Sesión activa recuperada');
        }
      } catch {
        // Ignorar fallo de recuperación inicial
      }
    };

    checkAndRecoverSession();

    return () => {
      isMounted = false;
    };
  }, [vehiculo?.id, tercero.id]);

  // 2. Escuchar lecturas del motor GPS en primer y segundo plano
  useEffect(() => {
    if (isTracking) {
      const unsubscribe = locationService.onLocationUpdate((pos: GPSPosition, reason: string) => {
        // Calcular incremento de distancia Haversine si existe posición anterior
        if (prevLocationRef.current) {
          const delta = gpsFilterService.calculateHaversineDistance(
            prevLocationRef.current.latitude,
            prevLocationRef.current.longitude,
            pos.latitude,
            pos.longitude
          );
          if (delta > 0) {
            distanceRef.current += delta;
            setTotalDistanceMeters(Math.round(distanceRef.current));
          }
        }

        prevLocationRef.current = pos;
        positionsCountRef.current += 1;
        setTotalPositionsCount(positionsCountRef.current);

        setCurrentLocation(pos);
        setAccuracyMeters(pos.accuracy ? Math.round(pos.accuracy) : null);

        // Convertir m/s a km/h
        const kmh = pos.speed && pos.speed > 0 ? Math.round(pos.speed * 3.6) : 0;
        setSpeedKmh(kmh);

        setLastUpdateTime(new Date(pos.timestamp).toLocaleTimeString());
        setFilterReason(reason);

        // Actualizar métricas acumuladas en la sesión cada 5 lecturas aceptadas
        if (activeSession?.id && positionsCountRef.current % 5 === 0) {
          trackingSessionService.updateSessionMetrics(
            activeSession.id,
            distanceRef.current,
            positionsCountRef.current
          );
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [isTracking, activeSession?.id]);

  // 3. Iniciar el Servicio y Tracking GPS (evitando duplicados)
  const startTracking = useCallback(async () => {
    setError(null);
    if (!vehiculo) {
      setError('No tienes un taxi o vehículo asignado actualmente.');
      return;
    }

    if (isTracking) {
      // Evitar crear múltiples watchers
      return;
    }

    setLoading(true);
    try {
      // A. Crear o recuperar la sesión en base de datos
      const session = await trackingSessionService.startSession(vehiculo.id, tercero.id);
      setActiveSession(session);

      // B. Iniciar motor GPS
      await locationService.startTracking(session.id, vehiculo.id);

      setIsTracking(true);
      setLastUpdateTime(new Date().toLocaleTimeString());
      setFilterReason('Tracking iniciado');
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar el servicio de ubicación.');
    } finally {
      setLoading(false);
    }
  }, [vehiculo, tercero.id, isTracking]);

  // 4. Detener el Servicio y Tracking GPS
  const stopTracking = useCallback(async () => {
    if (!activeSession || !vehiculo) return;

    setLoading(true);
    try {
      // A. Detener watcher GPS y tarea en segundo plano
      await locationService.stopTracking();

      // B. Guardar métricas finales y cerrar sesión en base de datos
      await trackingSessionService.endSession(
        activeSession.id,
        vehiculo.id,
        distanceRef.current,
        positionsCountRef.current
      );

      setIsTracking(false);
      setActiveSession(null);
      setCurrentLocation(null);
      setFilterReason('Servicio finalizado');
      setSpeedKmh(null);
      setAccuracyMeters(null);
      prevLocationRef.current = null;
    } catch (err: any) {
      setError(err.message || 'No se pudo detener el servicio.');
    } finally {
      setLoading(false);
    }
  }, [activeSession, vehiculo]);

  return {
    startTracking,
    stopTracking,
    isTracking,
    activeSession,
    currentLocation,
    totalDistanceMeters,
    totalPositionsCount,
    speedKmh,
    accuracyMeters,
    lastUpdateTime,
    filterReason,
    loading,
    error,
  };
}
