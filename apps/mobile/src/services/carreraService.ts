import { supabase } from './supabase';
import { Carrera, CarreraStatus } from '@maquitaxis/shared';

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
}

export const carreraDriverService = {
  /**
   * Mapea un registro SQL de la base de datos a la interfaz Carrera de TypeScript
   */
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
            createdAt: row.vehiculo.created_at,
            updatedAt: row.vehiculo.updated_at,
          }
        : undefined,
    };
  },

  /**
   * Obtiene la carrera activa (asignada, aceptada o en curso) para el conductor
   */
  async getActiveCarreraForDriver(driverTerceroId: string): Promise<Carrera | null> {
    try {
      const { data, error } = await supabase
        .from('carreras')
        .select('*, vehiculo:vehiculos(*)')
        .eq('driver_tercero_id', driverTerceroId)
        .in('status', ['asignado', 'aceptado', 'en_curso'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return this.mapRowToCarrera(data as RawCarreraRow);
    } catch {
      return null;
    }
  },

  /**
   * Suscribirse en tiempo real a nuevas asignaciones de carrera para el conductor
   */
  subscribeToAssignedCarreras(driverTerceroId: string, onUpdate: (carrera: Carrera) => void) {
    const channel = supabase
      .channel(`driver_carreras_${driverTerceroId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carreras',
          filter: `driver_tercero_id=eq.${driverTerceroId}`,
        },
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

  /**
   * Conductor ACEPTA la carrera asignada
   */
  async acceptCarrera(carreraId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('carreras')
      .update({
        status: 'aceptado',
        accepted_at: now,
        updated_at: now,
      })
      .eq('id', carreraId);

    if (error) {
      throw new Error(error.message || 'No se pudo aceptar la carrera.');
    }
  },

  /**
   * Conductor INICIA la carrera (activa el servicio en curso y vincula la tracking_session)
   */
  async startCarrera(carreraId: string, trackingSessionId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('carreras')
      .update({
        status: 'en_curso',
        started_at: now,
        tracking_session_id: trackingSessionId,
        updated_at: now,
      })
      .eq('id', carreraId);

    if (error) {
      throw new Error(error.message || 'No se pudo iniciar la carrera.');
    }
  },

  /**
   * Conductor FINALIZA la carrera
   */
  async completeCarrera(carreraId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('carreras')
      .update({
        status: 'completado',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', carreraId);

    if (error) {
      throw new Error(error.message || 'No se pudo completar la carrera.');
    }
  },

  /**
   * Conductor o Administrador CANCELA la carrera
   */
  async cancelCarrera(carreraId: string, reason?: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('carreras')
      .update({
        status: 'cancelado',
        cancelled_at: now,
        cancel_reason: reason || 'Cancelado por el conductor',
        updated_at: now,
      })
      .eq('id', carreraId);

    if (error) {
      throw new Error(error.message || 'No se pudo cancelar la carrera.');
    }
  },

  /**
   * Cargar historial de carreras del conductor
   */
  async getDriverCarrerasHistory(driverTerceroId: string, limit: number = 20): Promise<Carrera[]> {
    try {
      const { data, error } = await supabase
        .from('carreras')
        .select('*, vehiculo:vehiculos(*)')
        .eq('driver_tercero_id', driverTerceroId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((row) => this.mapRowToCarrera(row as RawCarreraRow));
    } catch {
      return [];
    }
  },
};
