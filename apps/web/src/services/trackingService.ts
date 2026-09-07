import { supabase } from './supabase';
import type { TaxiStatus } from '@maquitaxis/shared';

export interface ActiveVehicleTracking {
  vehiculoId: string;
  plate: string;
  model?: string;
  color?: string;
  status: TaxiStatus;
  lastKnownLat: number | null;
  lastKnownLng: number | null;
  lastLocationAt: string | null;
  heading?: number | null;
  speed?: number | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  activeSessionId?: string | null;
}

/**
 * Carga los vehículos activos o con ubicación conocida desde Supabase.
 */
export async function getActiveVehiclesTracking(): Promise<ActiveVehicleTracking[]> {
  // Consultar vehículos con relación a driver (terceros) y tracking_sessions activas
  const { data: vehiculosData, error } = await supabase
    .from('vehiculos')
    .select(`
      id,
      plate,
      model,
      color,
      status,
      last_known_lat,
      last_known_lng,
      last_location_at,
      driver_id,
      driver:terceros!vehiculos_driver_id_fkey (
        id,
        name,
        phone
      ),
      tracking_sessions (
        id,
        status
      )
    `)
    .order('plate', { ascending: true });

  if (error) {
    console.error('[trackingService] Error al obtener vehículos:', error);
    throw error;
  }

  if (!vehiculosData) return [];

  return vehiculosData.map((v: any) => {
    const activeSession = Array.isArray(v.tracking_sessions)
      ? v.tracking_sessions.find((s: any) => s.status === 'active')
      : null;

    const driverObj = Array.isArray(v.driver) ? v.driver[0] : v.driver;

    return {
      vehiculoId: v.id,
      plate: v.plate,
      model: v.model,
      color: v.color,
      status: (v.status as TaxiStatus) || 'sin_conexion',
      lastKnownLat: v.last_known_lat != null ? Number(v.last_known_lat) : null,
      lastKnownLng: v.last_known_lng != null ? Number(v.last_known_lng) : null,
      lastLocationAt: v.last_location_at || null,
      heading: null,
      speed: null,
      driverId: v.driver_id || driverObj?.id || null,
      driverName: driverObj?.name || 'Sin conductor asignado',
      driverPhone: driverObj?.phone || null,
      activeSessionId: activeSession?.id || null,
    };
  });
}

/**
 * Suscribe a cambios en tiempo real en la tabla vehiculos y tracking_sessions.
 */
export function subscribeToTrackingRealtime(
  onUpdate: () => void
) {
  const channel = supabase
    .channel('gps-monitoring-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vehiculos' },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tracking_sessions' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
