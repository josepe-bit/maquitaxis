import { supabase } from './supabase';
import { TrackingSession } from '@maquitaxis/shared';

export const trackingSessionService = {
  /**
   * Consulta si existe una sesión de seguimiento activa para un vehículo
   */
  async getActiveSession(vehiculoId: string, driverTerceroId?: string): Promise<TrackingSession | null> {
    try {
      let query = supabase
        .from('tracking_sessions')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .eq('status', 'active')
        .order('started_at', { ascending: false });

      if (driverTerceroId) {
        query = query.eq('driver_tercero_id', driverTerceroId);
      }

      const { data, error } = await query.limit(1).maybeSingle();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        vehiculoId: data.vehiculo_id,
        driverTerceroId: data.driver_tercero_id,
        startedAt: data.started_at,
        endedAt: data.ended_at || undefined,
        status: data.status,
        totalDistanceMeters: Number(data.total_distance_meters || 0),
        totalPositionsCount: Number(data.total_positions_count || 0),
      };
    } catch {
      return null;
    }
  },

  /**
   * Crear e iniciar una nueva sesión de seguimiento (o recuperar la sesión activa si ya existe)
   */
  async startSession(vehiculoId: string, driverTerceroId: string): Promise<TrackingSession> {
    // 1. Evitar sesiones duplicadas: Comprobar si ya existe una sesión activa
    const existingSession = await this.getActiveSession(vehiculoId, driverTerceroId);
    if (existingSession) {
      // Asegurar que el vehículo esté marcado como en_servicio
      await supabase
        .from('vehiculos')
        .update({ status: 'en_servicio', updated_at: new Date().toISOString() })
        .eq('id', vehiculoId);

      return existingSession;
    }

    // 2. Insertar la nueva sesión de tracking activa en Supabase PostgreSQL
    const { data: session, error: sessionError } = await supabase
      .from('tracking_sessions')
      .insert({
        vehiculo_id: vehiculoId,
        driver_tercero_id: driverTerceroId,
        status: 'active',
        started_at: new Date().toISOString(),
        total_distance_meters: 0,
        total_positions_count: 0,
      })
      .select('*')
      .single();

    if (sessionError || !session) {
      throw new Error(sessionError?.message || 'No se pudo crear la sesión de seguimiento en la base de datos.');
    }

    // 3. Actualizar el estado del vehículo a 'en_servicio'
    await supabase
      .from('vehiculos')
      .update({ status: 'en_servicio', updated_at: new Date().toISOString() })
      .eq('id', vehiculoId);

    return {
      id: session.id,
      vehiculoId: session.vehiculo_id,
      driverTerceroId: session.driver_tercero_id,
      startedAt: session.started_at,
      status: session.status,
      totalDistanceMeters: 0,
      totalPositionsCount: 0,
    };
  },

  /**
   * Actualizar progresivamente distancia acumulada y recuento de posiciones en la sesión activa
   */
  async updateSessionMetrics(sessionId: string, newTotalDistanceMeters: number, newTotalPositionsCount: number): Promise<void> {
    try {
      await supabase
        .from('tracking_sessions')
        .update({
          total_distance_meters: Math.round(newTotalDistanceMeters * 100) / 100,
          total_positions_count: newTotalPositionsCount,
        })
        .eq('id', sessionId);
    } catch {
      // Ignorar fallos temporales de actualización de métricas
    }
  },

  /**
   * Finalizar la sesión de seguimiento activa
   */
  async endSession(sessionId: string, vehiculoId: string, totalDistanceMeters?: number, totalPositionsCount?: number): Promise<void> {
    const now = new Date().toISOString();

    // 1. Marcar sesión como 'completed' y guardar totales finales
    const updatePayload: any = {
      status: 'completed',
      ended_at: now,
    };

    if (totalDistanceMeters !== undefined) {
      updatePayload.total_distance_meters = Math.round(totalDistanceMeters * 100) / 100;
    }
    if (totalPositionsCount !== undefined) {
      updatePayload.total_positions_count = totalPositionsCount;
    }

    await supabase
      .from('tracking_sessions')
      .update(updatePayload)
      .eq('id', sessionId);

    // 2. Regresar estado del vehículo a 'disponible'
    await supabase
      .from('vehiculos')
      .update({
        status: 'disponible',
        updated_at: now,
      })
      .eq('id', vehiculoId);
  },
};
