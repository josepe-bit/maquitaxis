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

  /**
   * Consulta si existe un comando activo ('pending' o 'executing') para el vehículo
   */
  async getActiveCommandForVehicle(vehiculoId: string): Promise<GpsCommand | null> {
    const { data, error } = await supabase
      .from('gps_commands')
      .select('*')
      .eq('vehiculo_id', vehiculoId)
      .in('status', ['pending', 'executing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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

  /**
   * Suscribe en tiempo real a los cambios en órdenes de control GPS para un vehículo específico
   */
  subscribeToVehicleGpsCommands(
    vehiculoId: string,
    onUpdate: (command: GpsCommand) => void
  ): () => void {
    const channelName = `web_gps_cmd_${vehiculoId}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gps_commands',
          filter: `vehiculo_id=eq.${vehiculoId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow && newRow.id) {
            onUpdate({
              id: newRow.id,
              vehiculoId: newRow.vehiculo_id,
              driverTerceroId: newRow.driver_tercero_id,
              command: newRow.command as GpsCommandType,
              status: newRow.status as any,
              requestedBy: newRow.requested_by,
              errorMessage: newRow.error_message,
              createdAt: newRow.created_at,
              updatedAt: newRow.updated_at,
              executedAt: newRow.executed_at,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

