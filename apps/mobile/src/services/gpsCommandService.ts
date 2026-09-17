import { supabase } from './supabase';
import { locationService } from './locationService';
import { trackingSessionService } from './trackingSession';
import { GpsCommand } from '@maquitaxis/shared';

export const gpsCommandService = {
  /**
   * Adquisición ATÓMICA en PostgreSQL: Intentar cambiar de 'pending' a 'executing'.
   * Previene race conditions cuando la consulta de pendientes y el callback Realtime
   * se ejecutan simultáneamente.
   */
  async acquireCommandLock(commandId: string, vehiculoId: string): Promise<boolean> {
    try {
      // 1. Intentar adquisición mediante RPC atómica SECURITY DEFINER
      const { data: rpcRes, error: rpcErr } = await (supabase.rpc as any)('acquire_gps_command_lock', {
        p_command_id: commandId,
        p_vehiculo_id: vehiculoId,
      });

      if (!rpcErr && rpcRes) {
        return rpcRes.success === true;
      }

      // 2. Fallback atómico directo a nivel de tabla (WHERE status = 'pending')
      const { data: updateData, error: updateErr } = await supabase
        .from('gps_commands')
        .update({
          status: 'executing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', commandId)
        .eq('status', 'pending')
        .select('id');

      if (updateErr || !updateData || updateData.length === 0) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  },

  /**
   * Transición final del comando (executing -> completed / failed)
   */
  async finalizeCommand(
    commandId: string,
    vehiculoId: string,
    status: 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    try {
      // 1. Intentar finalización via RPC SECURITY DEFINER
      const { error: rpcErr } = await (supabase.rpc as any)('finalize_gps_command', {
        p_command_id: commandId,
        p_vehiculo_id: vehiculoId,
        p_status: status,
        p_error_message: errorMessage || null,
      });

      if (!rpcErr) return;

      // 2. Fallback de finalización a nivel de tabla (WHERE status = 'executing')
      const now = new Date().toISOString();
      const updatePayload: any = {
        status,
        updated_at: now,
      };

      if (status === 'completed') {
        updatePayload.executed_at = now;
        updatePayload.error_message = null;
      } else {
        updatePayload.error_message = errorMessage || 'Error al ejecutar comando.';
      }

      await supabase
        .from('gps_commands')
        .update(updatePayload)
        .eq('id', commandId)
        .eq('status', 'executing');
    } catch {
      // Ignorar fallos de reporte final
    }
  },

  /**
   * Procesa una orden de comando GPS individual recibida desde la Web
   */
  async processCommand(commandRow: any, vehiculoId: string, driverTerceroId: string): Promise<void> {
    const commandId = commandRow.id;
    const commandType = commandRow.command;

    // A. Adquisición ATÓMICA: si retorna false, otro proceso (Realtime / Polling) ya lo adquirió.
    // FINALIZAR SILENCIOSAMENTE SIN EJECUTAR locationService.
    const acquired = await this.acquireCommandLock(commandId, vehiculoId);
    if (!acquired) {
      return;
    }

    // B. A PARTIR DE AQUÍ ESTE PROCESO ES EL ÚNICO DUEÑO ATÓMICO DEL COMANDO
    try {
      if (commandType === 'ACTIVAR_GPS') {
        // Verificar si existe una sesión de tracking activa en la base de datos
        const activeSession = await trackingSessionService.getActiveSession(vehiculoId, driverTerceroId);

        if (!activeSession) {
          // Si no existe sesión activa, NO crear sesiones artificiales
          await this.finalizeCommand(
            commandId,
            vehiculoId,
            'failed',
            'No existe una sesión de seguimiento activa para el vehículo.'
          );
          return;
        }

        // Iniciar motor de ubicación GPS para la sesión activa recuperada
        await locationService.startTracking(activeSession.id, vehiculoId);

        // Confirmar comando como 'completed'
        await this.finalizeCommand(commandId, vehiculoId, 'completed');

      } else if (commandType === 'DESACTIVAR_GPS') {
        // Detener motor de ubicación GPS
        await locationService.stopTracking();

        // Confirmar comando como 'completed'
        await this.finalizeCommand(commandId, vehiculoId, 'completed');
      }
    } catch (err: any) {
      console.error(`[gpsCommandService] Error ejecutando comando ${commandId}:`, err);
      await this.finalizeCommand(
        commandId,
        vehiculoId,
        'failed',
        err.message || 'Error interno al ejecutar comando GPS en el dispositivo.'
      );
    }
  },

  /**
   * Consulta y procesa comandos pendientes que hayan quedado sin procesar al reconectar red
   */
  async checkPendingCommands(vehiculoId: string, driverTerceroId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('gps_commands')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) return;

      for (const cmd of data) {
        await this.processCommand(cmd, vehiculoId, driverTerceroId);
      }
    } catch (err) {
      console.error('[gpsCommandService] Error verificando comandos pendientes:', err);
    }
  },

  /**
   * Suscribirse mediante Supabase Realtime a órdenes de control GPS dirigidas al vehículo
   */
  subscribeToGpsCommands(vehiculoId: string, driverTerceroId: string): () => void {
    // 1. Procesar comandos pendientes al iniciar la suscripción
    this.checkPendingCommands(vehiculoId, driverTerceroId);

    // 2. Escuchar canal Supabase Realtime
    const channel = supabase
      .channel(`gps_commands_vehiculo_${vehiculoId}`)
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
          if (newRow && newRow.status === 'pending') {
            this.processCommand(newRow, vehiculoId, driverTerceroId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
