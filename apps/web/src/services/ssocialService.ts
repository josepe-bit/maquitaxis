import { supabase } from './supabase';
import {
  SeguridadSocial,
  CreateSeguridadSocialInput,
  UpdateSeguridadSocialInput,
  Tercero,
  Mes,
  EventoCatalogo,
  EventoAppliesBy,
} from '@maquitaxis/shared';

export const ssocialService = {
  /**
   * Obtener registros de pago de Seguridad Social
   */
  async fetchSSocialRecords(driverId?: string, mesId?: number): Promise<SeguridadSocial[]> {
    let query = supabase
      .from('s_social')
      .select(`
        *,
        tercero:terceros!s_social_tercero_id_fkey (
          id,
          name,
          doc_number,
          phone,
          email
        ),
        mes:meses!s_social_mes_id_fkey (
          id,
          name,
          total_days
        ),
        evento:eventos!s_social_evento_id_fkey (
          id,
          name,
          estimated_value
        )
      `)
      .order('date', { ascending: false });

    if (driverId && driverId.trim() !== '') {
      query = query.eq('tercero_id', driverId);
    }
    if (mesId && mesId > 0) {
      query = query.eq('mes_id', mesId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching s_social records:', error);
      throw new Error(`Error al cargar registros de Seguridad Social: ${error.message}`);
    }

    if (!data) return [];

    return data.map((s: any) => ({
      id: s.id,
      terceroId: s.tercero_id,
      date: s.date,
      eventoId: s.evento_id || undefined,
      monthValue: Number(s.month_value || 0),
      daysPaid: Number(s.days_paid || 30),
      paymentAmount: Number(s.payment_amount || 0),
      mesId: Number(s.mes_id || 1),
      createdAt: s.created_at,
      tercero: s.tercero
        ? ({
            id: s.tercero.id,
            name: s.tercero.name,
            docNumber: s.tercero.doc_number,
            phone: s.tercero.phone,
            email: s.tercero.email,
          } as any)
        : undefined,
      mes: s.mes
        ? {
            id: Number(s.mes.id),
            name: s.mes.name,
            totalDays: Number(s.mes.total_days || 30),
          }
        : undefined,
      evento: s.evento
        ? {
            id: s.evento.id,
            name: s.evento.name,
            estimatedValue: Number(s.evento.estimated_value || 0),
          } as any
        : undefined,
    }));
  },

  /**
   * Obtener catálogo de conductores (is_driver = true)
   */
  async fetchDrivers(): Promise<Tercero[]> {
    const { data, error } = await supabase
      .from('terceros')
      .select('*')
      .eq('is_driver', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching drivers for s_social:', error);
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
   * Obtener lista de los 12 meses
   */
  async fetchMeses(): Promise<Mes[]> {
    const { data, error } = await supabase
      .from('meses')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching meses:', error);
      throw new Error(`Error al consultar lista de meses: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // Fallback de meses en español
      return [
        { id: 1, name: 'Enero', totalDays: 31 },
        { id: 2, name: 'Febrero', totalDays: 28 },
        { id: 3, name: 'Marzo', totalDays: 31 },
        { id: 4, name: 'Abril', totalDays: 30 },
        { id: 5, name: 'Mayo', totalDays: 31 },
        { id: 6, name: 'Junio', totalDays: 30 },
        { id: 7, name: 'Julio', totalDays: 31 },
        { id: 8, name: 'Agosto', totalDays: 31 },
        { id: 9, name: 'Septiembre', totalDays: 30 },
        { id: 10, name: 'Octubre', totalDays: 31 },
        { id: 11, name: 'Noviembre', totalDays: 30 },
        { id: 12, name: 'Diciembre', totalDays: 31 },
      ];
    }

    return data.map((m: any) => ({
      id: Number(m.id),
      name: m.name,
      totalDays: Number(m.total_days || 30),
    }));
  },

  /**
   * Buscar o crear automáticamente el evento de Seguridad Social en la tabla 'eventos'
   */
  async fetchOrCreateSSEvento(): Promise<EventoCatalogo> {
    const { data: existingList } = await supabase
      .from('eventos')
      .select('*')
      .ilike('name', '%Seguridad Social%')
      .limit(1);

    if (existingList && existingList.length > 0) {
      const e = existingList[0];
      return {
        id: e.id,
        name: e.name,
        kmsInterval: e.kms_interval || 0,
        monthsInterval: e.months_interval || 1,
        appliesBy: (e.applies_by as EventoAppliesBy) || 'meses',
        estimatedValue: Number(e.estimated_value || 500000),
      };
    }

    // Si no existe, crearlo
    const { data: newEvento, error } = await supabase
      .from('eventos')
      .insert({
        name: 'Pago de Seguridad Social',
        kms_interval: 0,
        months_interval: 1,
        applies_by: 'meses',
        estimated_value: 500000,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating default SS evento:', error);
      throw new Error(`Error al inicializar el evento de Seguridad Social: ${error.message}`);
    }

    return {
      id: newEvento.id,
      name: newEvento.name,
      kmsInterval: newEvento.kms_interval || 0,
      monthsInterval: newEvento.months_interval || 1,
      appliesBy: (newEvento.applies_by as EventoAppliesBy) || 'meses',
      estimatedValue: Number(newEvento.estimated_value || 500000),
    };
  },

  /**
   * Registrar pago de Seguridad Social del Conductor
   */
  async createSSocial(input: CreateSeguridadSocialInput): Promise<SeguridadSocial> {
    const computedPayment = (input.monthValue / 30) * input.daysPaid;

    const { data, error } = await supabase
      .from('s_social')
      .insert({
        tercero_id: input.terceroId,
        date: input.date,
        evento_id: input.eventoId || null,
        month_value: input.monthValue,
        days_paid: input.daysPaid,
        payment_amount: computedPayment,
        mes_id: input.mesId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating s_social record:', error);
      throw new Error(`No se pudo guardar el pago de Seguridad Social: ${error.message}`);
    }

    return {
      id: data.id,
      terceroId: data.tercero_id,
      date: data.date,
      eventoId: data.evento_id || undefined,
      monthValue: Number(data.month_value || 0),
      daysPaid: Number(data.days_paid || 30),
      paymentAmount: Number(data.payment_amount || 0),
      mesId: Number(data.mes_id || 1),
      createdAt: data.created_at,
    };
  },

  /**
   * Actualizar registro de Seguridad Social
   */
  async updateSSocial(id: string, input: UpdateSeguridadSocialInput): Promise<SeguridadSocial> {
    const monthVal = input.monthValue ?? 0;
    const days = input.daysPaid ?? 30;
    const computedPayment = (monthVal / 30) * days;

    const { data, error } = await supabase
      .from('s_social')
      .update({
        tercero_id: input.terceroId,
        date: input.date,
        evento_id: input.eventoId || null,
        month_value: monthVal,
        days_paid: days,
        payment_amount: computedPayment,
        mes_id: input.mesId,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating s_social record:', error);
      throw new Error(`No se pudo actualizar el registro de Seguridad Social: ${error.message}`);
    }

    return {
      id: data.id,
      terceroId: data.tercero_id,
      date: data.date,
      eventoId: data.evento_id || undefined,
      monthValue: Number(data.month_value || 0),
      daysPaid: Number(data.days_paid || 30),
      paymentAmount: Number(data.payment_amount || 0),
      mesId: Number(data.mes_id || 1),
      createdAt: data.created_at,
    };
  },

  /**
   * Eliminar registro de Seguridad Social
   */
  async deleteSSocial(id: string): Promise<void> {
    const { error } = await supabase.from('s_social').delete().eq('id', id);

    if (error) {
      console.error('Error deleting s_social record:', error);
      throw new Error(`No se pudo eliminar el registro de Seguridad Social: ${error.message}`);
    }
  },
};
