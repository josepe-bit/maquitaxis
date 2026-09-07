import { supabase } from './supabase';
import type { VehicleAlert, AlertsOverviewSummary, AlertState, EventoAppliesBy } from '@maquitaxis/shared';

/**
 * Servicio frontend para consultar el panorama de alertas mediante el RPC seguro get_vehicle_event_alerts()
 * El backend es la única autoridad de seguridad (auth.uid()).
 */
export async function getVehicleAlertsOverview(): Promise<AlertsOverviewSummary> {
  const { data, error } = await (supabase as any).rpc('get_vehicle_event_alerts');

  if (error) {
    console.error('Error al invocar get_vehicle_event_alerts:', error);
    throw new Error(error.message || 'No se pudo obtener el panorama de alertas');
  }

  const rawRows = (data || []) as any[];

  let vencidos = 0;
  let proximos = 0;
  let normales = 0;
  let sinDatos = 0;
  let sinHistorial = 0;

  const alerts: VehicleAlert[] = rawRows.map((row) => {
    const state = (row.state || 'SIN_DATOS') as AlertState;

    if (state === 'VENCIDO') vencidos++;
    else if (state === 'PROXIMO') proximos++;
    else if (state === 'NORMAL') normales++;
    else if (state === 'SIN_HISTORIAL') sinHistorial++;
    else sinDatos++;

    return {
      vehiculoId: row.vehiculo_id,
      plate: row.plate,
      model: row.model || null,
      eventoId: row.evento_id,
      eventoName: row.evento_name,
      appliesBy: (row.applies_by || 'ninguno') as EventoAppliesBy,
      state,
      currentMileage: row.current_mileage != null ? Number(row.current_mileage) : null,
      targetMileage: row.target_mileage != null ? Number(row.target_mileage) : null,
      remainingKms: row.remaining_kms != null ? Number(row.remaining_kms) : null,
      targetDate: row.target_date || null,
      remainingDays: row.remaining_days != null ? Number(row.remaining_days) : null,
      reason: row.reason || '',
      cycleAnchor: row.cycle_anchor || 'no_cycle',
      driverId: row.driver_id || null,
      driverName: row.driver_name || null,
      ownerId: row.owner_id || null,
      ownerName: row.owner_name || null,
    };
  });

  return {
    vencidos,
    proximos,
    normales,
    sinDatos,
    sinHistorial,
    alerts,
  };
}
