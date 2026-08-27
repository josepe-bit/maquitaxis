import { GPSConfig, GPSPosition, DEFAULT_GPS_CONFIG } from '@maquitaxis/shared';

export const gpsFilterService = {
  /**
   * Calcula la distancia Haversine en metros entre dos coordenadas geográficas
   */
  calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  },

  /**
   * Evalúa si una posición GPS entrante debe registrarse según la estrategia inteligente:
   * 1. Precisión del GPS <= minAccuracyMeters (ej: <= 30m)
   * 2. Desplazamiento >= minDistanceMeters (ej: >= 15m) O tiempo transcurrido >= maxIntervalSeconds (ej: >= 30s)
   */
  shouldRecordPosition(
    lastPosition: GPSPosition | null,
    currentLat: number,
    currentLng: number,
    accuracy: number | undefined,
    currentTimestampMs: number = Date.now(),
    config: GPSConfig = DEFAULT_GPS_CONFIG
  ): { shouldRecord: boolean; reason: string; distanceMeters: number } {
    // 1. Filtrar por Precisión (Rechazar si el margen de error es muy alto)
    if (accuracy && accuracy > config.minAccuracyMeters) {
      return {
        shouldRecord: false,
        reason: `Precisión pobre (${Math.round(accuracy)}m > ${config.minAccuracyMeters}m)`,
        distanceMeters: 0,
      };
    }

    // 2. Si es la primera posición registrada en la sesión, se acepta automáticamente
    if (!lastPosition) {
      return {
        shouldRecord: true,
        reason: 'Primera posición de la sesión',
        distanceMeters: 0,
      };
    }

    // 3. Calcular distancia respecto a la última posición guardada
    const distanceMeters = this.calculateHaversineDistance(
      lastPosition.latitude,
      lastPosition.longitude,
      currentLat,
      currentLng
    );

    // 4. Calcular tiempo transcurrido en segundos respecto al último envío
    const lastTimestampMs = new Date(lastPosition.timestamp).getTime();
    const elapsedSeconds = Math.floor((currentTimestampMs - lastTimestampMs) / 1000);

    // 5. Criterio A: Desplazamiento suficiente (Vehículo en movimiento)
    if (distanceMeters >= config.minDistanceMeters) {
      return {
        shouldRecord: true,
        reason: `Desplazamiento suficiente (${Math.round(distanceMeters)}m >= ${config.minDistanceMeters}m)`,
        distanceMeters,
      };
    }

    // 6. Criterio B: Tiempo de Liveness (Vehículo detenido pero confirmando conexión activa)
    if (elapsedSeconds >= config.maxIntervalSeconds) {
      return {
        shouldRecord: true,
        reason: `Señal de liveness por tiempo (${elapsedSeconds}s >= ${config.maxIntervalSeconds}s)`,
        distanceMeters,
      };
    }

    // 7. En caso contrario, desestimar la posición redundante
    return {
      shouldRecord: false,
      reason: `Posición idéntica/cercana (${Math.round(distanceMeters)}m < ${config.minDistanceMeters}m y ${elapsedSeconds}s < ${config.maxIntervalSeconds}s)`,
      distanceMeters,
    };
  },
};
