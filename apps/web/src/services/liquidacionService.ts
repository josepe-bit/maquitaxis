import { supabase } from './supabase';
import {
  LiquidacionConductor,
  CreateLiquidacionInput,
  UpdateLiquidacionInput,
  Tercero,
} from '@maquitaxis/shared';

export const liquidacionService = {
  /**
   * Obtener registros de liquidación de prestaciones sociales de conductores
   */
  async fetchLiquidaciones(driverId?: string, startDate?: string, endDate?: string): Promise<LiquidacionConductor[]> {
    let query = supabase
      .from('liquidacion')
      .select(`
        *,
        tercero:terceros!liquidacion_tercero_id_fkey (
          id,
          name,
          doc_number,
          phone,
          email
        )
      `)
      .order('payment_date', { ascending: false });

    if (driverId && driverId.trim() !== '') {
      query = query.eq('tercero_id', driverId);
    }
    if (startDate) {
      query = query.gte('payment_date', startDate);
    }
    if (endDate) {
      query = query.lte('payment_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching liquidaciones:', error);
      throw new Error(`Error al cargar registros de liquidación de conductores: ${error.message}`);
    }

    if (!data) return [];

    return data.map((l: any) => ({
      id: l.id,
      terceroId: l.tercero_id,
      paymentDate: l.payment_date,
      fromDate: l.from_date,
      toDate: l.to_date,
      detail: l.detail,
      amount: Number(l.amount || 0),
      createdAt: l.created_at,
      tercero: l.tercero
        ? ({
            id: l.tercero.id,
            name: l.tercero.name,
            docNumber: l.tercero.doc_number,
            phone: l.tercero.phone,
            email: l.tercero.email,
          } as any)
        : undefined,
    }));
  },

  /**
   * Obtener conductores registrados
   */
  async fetchDrivers(): Promise<Tercero[]> {
    const { data, error } = await supabase
      .from('terceros')
      .select('*')
      .eq('is_driver', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching drivers for liquidacion:', error);
      throw new Error(`Error al consultar lista de conductores: ${error.message}`);
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
   * Registrar una nueva liquidación de conductor
   */
  async createLiquidacion(input: CreateLiquidacionInput): Promise<LiquidacionConductor> {
    const { data, error } = await supabase
      .from('liquidacion')
      .insert({
        tercero_id: input.terceroId,
        payment_date: input.paymentDate,
        from_date: input.fromDate,
        to_date: input.toDate,
        detail: input.detail,
        amount: input.amount,
        concept: input.concept || 'prestaciones_sociales',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating liquidacion:', error);
      throw new Error(`No se pudo guardar la liquidación del conductor: ${error.message}`);
    }

    return {
      id: data.id,
      terceroId: data.tercero_id,
      paymentDate: data.payment_date,
      fromDate: data.from_date,
      toDate: data.to_date,
      detail: data.detail,
      amount: Number(data.amount || 0),
      concept: data.concept as any,
      createdAt: data.created_at,
    };
  },


  /**
   * Actualizar registro de liquidación
   */
  async updateLiquidacion(id: string, input: UpdateLiquidacionInput): Promise<LiquidacionConductor> {
    const { data, error } = await supabase
      .from('liquidacion')
      .update({
        tercero_id: input.terceroId,
        payment_date: input.paymentDate,
        from_date: input.fromDate,
        to_date: input.toDate,
        detail: input.detail,
        amount: input.amount,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating liquidacion:', error);
      throw new Error(`No se pudo actualizar el registro de liquidación: ${error.message}`);
    }

    return {
      id: data.id,
      terceroId: data.tercero_id,
      paymentDate: data.payment_date,
      fromDate: data.from_date,
      toDate: data.to_date,
      detail: data.detail,
      amount: Number(data.amount || 0),
      createdAt: data.created_at,
    };
  },

  /**
   * Eliminar registro de liquidación
   */
  async deleteLiquidacion(id: string): Promise<void> {
    const { error } = await supabase.from('liquidacion').delete().eq('id', id);

    if (error) {
      console.error('Error deleting liquidacion:', error);
      throw new Error(`No se pudo eliminar el registro de liquidación: ${error.message}`);
    }
  },
};
