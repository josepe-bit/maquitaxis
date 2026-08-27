import { supabase } from './supabase';
import { Vehiculo, GPSPosition } from '@maquitaxis/shared';

export interface RealtimePositionCallback {
  (position: GPSPosition): void;
}

export interface RealtimeVehiculoCallback {
  (vehiculo: Vehiculo): void;
}

interface RawVehiculoRow {
  id: string;
  plate: string;
  owner_id: string;
  servicio_id: string;
  model: string;
  displacement?: string;
  fuel_type?: string;
  passenger_capacity?: number;
  daily_fee: number | string;
  savings_amount: number | string;
  status: any;
  last_known_lat?: number;
  last_known_lng?: number;
  last_location_at?: string;
  created_at: string;
  updated_at: string;
  driver?: {
    id: string;
    doc_type: string;
    doc_number: string;
    name: string;
    is_owner: boolean;
    is_service_client: boolean;
    is_driver: boolean;
    is_supplier: boolean;
    created_at: string;
    updated_at: string;
  };
}

interface RawGpsPositionRow {
  id: number | string;
  session_id: string;
  vehiculo_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  recorded_at: string;
}

export const realtimeService = {
  /**
   * Obtener la lista inicial de vehículos registrados en la plataforma
   */
  async fetchVehiculos(): Promise<Vehiculo[]> {
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*, driver:terceros!vehiculos_driver_id_fkey(*)');

    if (error || !data) {
      return [];
    }

    const rows = data as RawVehiculoRow[];

    return rows.map((item) => ({
      id: item.id,
      plate: item.plate,
      ownerId: item.owner_id,
      servicioId: item.servicio_id,
      model: item.model,
      displacement: item.displacement,
      fuelType: item.fuel_type,
      passengerCapacity: item.passenger_capacity,
      dailyFee: Number(item.daily_fee || 0),
      savingsAmount: Number(item.savings_amount || 0),
      status: item.status,
      lastKnownLat: item.last_known_lat,
      lastKnownLng: item.last_known_lng,
      lastLocationAt: item.last_location_at,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      driver: item.driver
        ? {
            id: item.driver.id,
            docType: item.driver.doc_type,
            docNumber: item.driver.doc_number,
            name: item.driver.name,
            isOwner: item.driver.is_owner,
            isServiceClient: item.driver.is_service_client,
            isDriver: item.driver.is_driver,
            isSupplier: item.driver.is_supplier,
            createdAt: item.driver.created_at,
            updatedAt: item.driver.updated_at,
          }
        : undefined,
    }));
  },

  /**
   * Suscribirse en tiempo real a cambios de posición e inserciones de GPS vía WebSockets
   */
  subscribeToLivePositions(onPosition: RealtimePositionCallback, onVehiculoUpdate: RealtimeVehiculoCallback) {
    const channel = supabase
      .channel('realtime_taxi_positions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'gps_positions' },
        (payload) => {
          const newPos = payload.new as RawGpsPositionRow;
          onPosition({
            id: String(newPos.id),
            sessionId: newPos.session_id,
            vehiculoId: newPos.vehiculo_id,
            latitude: newPos.latitude,
            longitude: newPos.longitude,
            altitude: newPos.altitude,
            speed: newPos.speed,
            heading: newPos.heading,
            accuracy: newPos.accuracy,
            timestamp: newPos.recorded_at,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vehiculos' },
        (payload) => {
          const v = payload.new as RawVehiculoRow;
          onVehiculoUpdate({
            id: v.id,
            plate: v.plate,
            ownerId: v.owner_id,
            servicioId: v.servicio_id,
            model: v.model,
            dailyFee: Number(v.daily_fee || 0),
            status: v.status,
            lastKnownLat: v.last_known_lat,
            lastKnownLng: v.last_known_lng,
            lastLocationAt: v.last_location_at,
            createdAt: v.created_at,
            updatedAt: v.updated_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
