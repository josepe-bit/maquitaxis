import { supabase } from './supabase';
import type { GpsCommandType, GpsCommand } from '@maquitaxis/shared';

export const webGpsCommandService = {
  /**
   * Envía una orden remota de control GPS a un vehículo
   */
  async sendGpsCommand(
    vehiculoId: string,
    command: GpsCommandType,
    driverTerceroId?: string | null,
    requestedByTerceroId?: string | null
  ): Promise<GpsCommand> {
    const { data, error } = await supabase
      .from('gps_commands')
      .insert({
        vehiculo_id: vehiculoId,
        driver_tercero_id: driverTerceroId || null,
        command,
        status: 'pending',
        requested_by: requestedByTerceroId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'No se pudo emitir la orden de control GPS.');
    }

    return {
      id: data.id,
      vehiculoId: data.vehiculo_id,
      driverTerceroId: data.driver_tercero_id,
      command: data.command as GpsCommandType,
      status: data.status as any,
      requestedBy: data.requested_by,
      errorMessage: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      executedAt: data.executed_at,
    };
  },

  /**
   * Consulta el estado de un comando enviado
   */
  async getCommandStatus(commandId: string): Promise<GpsCommand | null> {
    const { data, error } = await supabase
      .from('gps_commands')
      .select('*')
      .eq('id', commandId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      vehiculoId: data.vehiculo_id,
      driverTerceroId: data.driver_tercero_id,
      command: data.command as GpsCommandType,
      status: data.status as any,
      requestedBy: data.requested_by,
      errorMessage: data.error_message,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      executedAt: data.executed_at,
    };
  },
};
