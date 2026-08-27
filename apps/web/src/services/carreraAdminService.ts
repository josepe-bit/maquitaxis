import { supabase } from './supabase';
import { Carrera, CarreraStatus } from '@maquitaxis/shared';

export interface CreateCarreraInput {
  clientName: string;
  clientPhone: string;
  originAddress: string;
  destinationAddress: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  notes?: string;
}

interface RawCarreraRow {
  id: string;
  client_name: string;
  client_phone: string;
  origin_address: string;
  destination_address: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  notes?: string;
  status: CarreraStatus;
  cancel_reason?: string;
  vehiculo_id?: string;
  driver_tercero_id?: string;
  assigned_at?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  tracking_session_id?: string;
  created_at: string;
  updated_at: string;
  vehiculo?: any;
  driver?: any;
}

export const carreraAdminService = {
  mapRowToCarrera(row: RawCarreraRow): Carrera {
    return {
      id: row.id,
      clientName: row.client_name,
      clientPhone: row.client_phone,
      originAddress: row.origin_address,
      destinationAddress: row.destination_address,
      originLat: row.origin_lat,
      originLng: row.origin_lng,
      destinationLat: row.destination_lat,
      destinationLng: row.destination_lng,
      notes: row.notes,
      status: row.status,
      cancelReason: row.cancel_reason,
      vehiculoId: row.vehiculo_id,
      driverTerceroId: row.driver_tercero_id,
      assignedAt: row.assigned_at,
      acceptedAt: row.accepted_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      trackingSessionId: row.tracking_session_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      vehiculo: row.vehiculo
        ? {
            id: row.vehiculo.id,
            plate: row.vehiculo.plate,
            ownerId: row.vehiculo.owner_id,
            servicioId: row.vehiculo.servicio_id,
            model: row.vehiculo.model,
            dailyFee: Number(row.vehiculo.daily_fee || 0),
            status: row.vehiculo.status,
            lastKnownLat: row.vehiculo.last_known_lat,
            lastKnownLng: row.vehiculo.last_known_lng,
            lastLocationAt: row.vehiculo.last_location_at,
            createdAt: row.vehiculo.created_at,
            updatedAt: row.vehiculo.updated_at,
          }
        : undefined,
      driver: row.driver
        ? {
            id: row.driver.id,
            docType: row.driver.doc_type,
            docNumber: row.driver.doc_number,
            name: row.driver.name,
            phone: row.driver.phone,
            isOwner: row.driver.is_owner,
            isServiceClient: row.driver.is_service_client,
            isDriver: row.driver.is_driver,
            isSupplier: row.driver.is_supplier,
            createdAt: row.driver.created_at,
            updatedAt: row.driver.updated_at,
          }
        : undefined,
    };
  },

  /**
   * Registrar una nueva solicitud de carrera (estado = 'pendiente')
   */
  async createCarrera(input: CreateCarreraInput): Promise<Carrera> {
    const { data, error } = await supabase
      .from('carreras')
      .insert({
        client_name: input.clientName.trim(),
        client_phone: input.clientPhone.trim(),
        origin_address: input.originAddress.trim(),
        destination_address: input.destinationAddress.trim(),
        origin_lat: input.originLat,
        origin_lng: input.originLng,
        destination_lat: input.destinationLat,
        destination_lng: input.destinationLng,
        notes: input.notes,
        status: 'pendiente',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al crear la solicitud de carrera.');
    }

    return this.mapRowToCarrera(data as RawCarreraRow);
  },

  /**
   * Asignar un taxi disponible a una carrera pendiente
   */
  async assignVehiculoToCarrera(carreraId: string, vehiculoId: string, driverTerceroId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('carreras')
      .update({
        vehiculo_id: vehiculoId,
        driver_tercero_id: driverTerceroId,
        status: 'asignado',
        assigned_at: now,
        updated_at: now,
      })
      .eq('id', carreraId);

    if (error) {
      throw new Error(error.message || 'No se pudo asignar el taxi a la carrera.');
    }
  },

  /**
   * Cargar listado de carreras con filtros opcionales
   */
  async fetchCarreras(statusFilter?: CarreraStatus): Promise<Carrera[]> {
    let query = supabase
      .from('carreras')
      .select('*, vehiculo:vehiculos(*), driver:terceros!carreras_driver_tercero_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((row) => this.mapRowToCarrera(row as RawCarreraRow));
  },

  /**
   * Suscribirse vía Realtime WebSockets a cambios en la tabla carreras
   */
  subscribeToCarrerasRealtime(onUpdate: (carrera: Carrera) => void) {
    const channel = supabase
      .channel('admin_carreras_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'carreras' },
        (payload) => {
          if (payload.new) {
            onUpdate(this.mapRowToCarrera(payload.new as RawCarreraRow));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
