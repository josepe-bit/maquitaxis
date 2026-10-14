import { supabase } from './supabase';
import {
  DevolucionAhorroConductor,
  CreateDevolucionAhorroInput,
  Tercero,
} from '@maquitaxis/shared';

export interface DriverSavingsSummary {
  driverId: string;
  driverName: string;
  totalGenerated: number;
  totalReturned: number;
  availableBalance: number;
}

export interface RegisterDevolucionResult {
  success: boolean;
  devolucionId: string;
  driverId: string;
  driverName: string;
  returnedAmount: number;
  newAvailableBalance: number;
}

export interface DevolucionFilterParams {
  driverId?: string;
  startDate?: string;
  endDate?: string;
  periodFrom?: string;
  periodTo?: string;
  servicioId?: string | null;
}

export const ahorroConductorService = {
  /**
   * Obtener historial de devoluciones de ahorro del conductor desde la tabla independiente
   * public.devoluciones_ahorro_conductor.
   */
  async fetchDevoluciones(params?: DevolucionFilterParams): Promise<DevolucionAhorroConductor[]> {
    let query = supabase
      .from('devoluciones_ahorro_conductor')
      .select(`
        *,
        driver:terceros!devoluciones_ahorro_conductor_driver_id_fkey (
          id,
          name,
          doc_number,
          phone,
          email
        )
      `)
      .order('payment_date', { ascending: false });

    if (params?.driverId && params.driverId.trim() !== '') {
      query = query.eq('driver_id', params.driverId);
    } else if (params?.servicioId) {
      const { data: companyVehicles } = await supabase
        .from('vehiculos')
        .select('driver_id')
        .eq('servicio_id', params.servicioId);

      const companyDriverIds = (companyVehicles || [])
        .map((v: any) => v.driver_id)
        .filter((id: string | null) => Boolean(id));

      if (companyDriverIds.length > 0) {
        query = query.or(`servicio_id.eq.${params.servicioId},driver_id.in.(${companyDriverIds.join(',')})`);
      } else {
        query = query.eq('servicio_id', params.servicioId);
      }
    }

    if (params?.startDate) {
      query = query.gte('payment_date', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('payment_date', params.endDate);
    }
    if (params?.periodFrom) {
      query = query.gte('from_date', params.periodFrom);
    }
    if (params?.periodTo) {
      query = query.lte('to_date', params.periodTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching devoluciones:', error);
      throw new Error(`Error al consultar devoluciones de ahorro: ${error.message}`);
    }

    if (!data) return [];

    return data.map((d: any) => ({
      id: d.id,
      driverId: d.driver_id,
      paymentDate: d.payment_date,
      fromDate: d.from_date,
      toDate: d.to_date,
      detail: d.detail,
      amount: Number(d.amount || 0),
      servicioId: d.servicio_id,
      idempotencyKey: d.idempotency_key,
      createdBy: d.created_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      isHistoric: false,
      driver: d.driver
        ? ({
            id: d.driver.id,
            name: d.driver.name,
            docNumber: d.driver.doc_number,
            phone: d.driver.phone,
            email: d.driver.email,
          } as any)
        : undefined,
    }));
  },

  /**
   * Obtener conductores disponibles para seleccionar en el formulario
   */
  async fetchDrivers(servicioId?: string | null): Promise<Tercero[]> {
    let query = supabase
      .from('terceros')
      .select('*')
      .eq('is_driver', true)
      .order('name', { ascending: true });

    if (servicioId) {
      const { data: companyVehicles } = await supabase
        .from('vehiculos')
        .select('driver_id')
        .eq('servicio_id', servicioId);

      const companyDriverIds = (companyVehicles || [])
        .map((v: any) => v.driver_id)
        .filter((id: string | null) => Boolean(id));

      if (companyDriverIds.length > 0) {
        query = query.in('id', companyDriverIds);
      } else {
        query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching drivers for ahorro:', error);
      throw new Error(`Error al consultar la lista de conductores: ${error.message}`);
    }

    if (!data) return [];

    return data.map((t: any) => ({
      id: t.id,
      docType: t.doc_type,
      docNumber: t.doc_number,
      name: t.name,
      phone: t.phone,
      email: t.email,
      isOwner: t.is_owner,
      isServiceClient: t.is_service_client,
      isDriver: t.is_driver,
      isSupplier: t.is_supplier,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));
  },

  /**
   * Consultar saldo disponible de ahorro del conductor en vivo
   * Consume la RPC consolidada get_driver_savings_summary.
   */
  async getDriverSavingsSummary(driverId: string): Promise<DriverSavingsSummary> {
    const { data, error } = await supabase.rpc('get_driver_savings_summary', {
      p_driver_id: driverId,
    });

    if (error) {
      console.error('Error fetching driver savings summary:', error);
      throw new Error(`Error al consultar el saldo del conductor: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      return {
        driverId,
        driverName: 'Conductor',
        totalGenerated: 0,
        totalReturned: 0,
        availableBalance: 0,
      };
    }

    const totalGenerated = Number(row.res_total_generated || 0);
    const totalReturned = Number(row.res_total_returned || 0);
    const availableBalance = Number(row.res_available_balance ?? Math.max(totalGenerated - totalReturned, 0));
    const driverName = row.res_driver_name || 'Conductor';

    return {
      driverId: row.res_driver_id || driverId,
      driverName,
      totalGenerated,
      totalReturned,
      availableBalance: Math.max(availableBalance, 0),
    };
  },

  /**
   * Registrar nueva devolución atómica en la tabla independiente public.devoluciones_ahorro_conductor
   * Genera o recibe una clave de idempotencia obligatoria para garantizar no duplicidad de desembolsos.
   */
  async registerDriverSavingsReturn(input: CreateDevolucionAhorroInput): Promise<RegisterDevolucionResult> {
    const idempotencyKey =
      input.idempotencyKey ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }));

    const { data, error } = await supabase.rpc('register_driver_savings_return_v2', {
      p_driver_id: input.driverId,
      p_amount: input.amount,
      p_payment_date: input.paymentDate,
      p_from_date: input.fromDate,
      p_to_date: input.toDate,
      p_detail: input.detail,
      p_idempotency_key: idempotencyKey,
      p_servicio_id: input.servicioId || null,
    });

    if (error) {
      console.error('Error in register_driver_savings_return_v2:', error);
      throw new Error(error.message);
    }

    const res = typeof data === 'string' ? JSON.parse(data) : data;

    return {
      success: Boolean(res.success),
      devolucionId: res.devolucion_id,
      driverId: res.driver_id,
      driverName: res.driver_name,
      returnedAmount: Number(res.returned_amount || 0),
      newAvailableBalance: Number(res.new_available_balance || 0),
    };
  },
};
