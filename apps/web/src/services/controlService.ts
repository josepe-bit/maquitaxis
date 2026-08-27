import { supabase } from './supabase';
import { ControlEvento, CreateControlInput, UpdateControlInput, EventoCatalogo, Vehiculo, EventoAppliesBy } from '@maquitaxis/shared';

export const controlService = {
  /**
   * Obtener todos los registros de control de eventos ejecutados en vehículos
   */
  async fetchControles(vehiculoId?: string, eventoId?: string): Promise<ControlEvento[]> {
    let query = supabase
      .from('control')
      .select(`
        *,
        evento:eventos (
          id,
          name,
          kms_interval,
          months_interval,
          applies_by,
          estimated_value
        ),
        vehiculo:vehiculos (
          id,
          plate,
          model,
          driver:terceros!vehiculos_driver_id_fkey (
            id,
            name
          )
        )
      `)
      .order('date', { ascending: false });

    if (vehiculoId && vehiculoId.trim() !== '') {
      query = query.eq('vehiculo_id', vehiculoId);
    }
    if (eventoId && eventoId.trim() !== '') {
      query = query.eq('evento_id', eventoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching controles:', error);
      throw new Error(`Error al cargar registros de control de mantenimiento: ${error.message}`);
    }

    if (!data) return [];

    return data.map((c: any) => ({
      id: c.id,
      date: c.date,
      eventoId: c.evento_id,
      vehiculoId: c.vehiculo_id,
      unitValue: Number(c.unit_value || 0),
      quantity: Number(c.quantity || 1),
      totalValue: Number(c.total_value || 0),
      currentMileage: Number(c.current_mileage || 0),
      nextChangeMileage: c.next_change_mileage ? Number(c.next_change_mileage) : undefined,
      nextChangeDate: c.next_change_date || undefined,
      createdAt: c.created_at,
      evento: c.evento
        ? {
            id: c.evento.id,
            name: c.evento.name,
            kmsInterval: c.evento.kms_interval ?? 0,
            monthsInterval: c.evento.months_interval ?? 0,
            appliesBy: (c.evento.applies_by as EventoAppliesBy) || 'kilometros',
            estimatedValue: Number(c.evento.estimated_value || 0),
          }
        : undefined,
      vehiculo: c.vehiculo
        ? ({
            id: c.vehiculo.id,
            plate: c.vehiculo.plate,
            model: c.vehiculo.model,
            driver: c.vehiculo.driver ? { name: c.vehiculo.driver.name } : undefined,
          } as any)
        : undefined,
    }));
  },

  /**
   * Obtener catálogo de eventos para autocompletar formulario
   */
  async fetchEventosForControl(): Promise<EventoCatalogo[]> {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching eventos for control:', error);
      throw new Error(`Error al cargar catálogo de eventos: ${error.message}`);
    }

    if (!data) return [];

    return data.map((e: any) => ({
      id: e.id,
      name: e.name,
      kmsInterval: e.kms_interval ?? 0,
      monthsInterval: e.months_interval ?? 0,
      appliesBy: (e.applies_by as EventoAppliesBy) || 'kilometros',
      estimatedValue: Number(e.estimated_value || 0),
      createdAt: e.created_at,
    }));
  },

  /**
   * Obtener lista de vehículos para autocompletar formulario
   */
  async fetchVehiculosForControl(): Promise<Vehiculo[]> {
    const { data, error } = await supabase
      .from('vehiculos')
      .select(`
        *,
        driver:terceros!vehiculos_driver_id_fkey (
          id,
          name
        )
      `)
      .order('plate', { ascending: true });

    if (error) {
      console.error('Error fetching vehiculos for control:', error);
      throw new Error(`Error al cargar lista de vehículos: ${error.message}`);
    }

    if (!data) return [];

    return data.map((v: any) => ({
      id: v.id,
      plate: v.plate,
      ownerId: v.owner_id,
      servicioId: v.servicio_id,
      model: v.model,
      dailyFee: Number(v.daily_fee || 0),
      savingsAmount: Number(v.savings_amount || 0),
      driverId: v.driver_id,
      status: v.status,
      driver: v.driver ? ({ id: v.driver.id, name: v.driver.name } as any) : undefined,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    })) as Vehiculo[];
  },

  /**
   * Registrar un nuevo mantenimiento de control
   * Regla requerida: Actualizar el campo 'estimated_value' en la tabla 'eventos' con el 'unit_value' registrado aquí.
   */
  async createControl(input: CreateControlInput): Promise<ControlEvento> {
    const totalVal = input.unitValue * input.quantity;

    const { data, error } = await supabase
      .from('control')
      .insert({
        date: input.date,
        evento_id: input.eventoId,
        vehiculo_id: input.vehiculoId,
        unit_value: input.unitValue,
        quantity: input.quantity,
        total_value: totalVal,
        current_mileage: input.currentMileage,
        next_change_mileage: input.nextChangeMileage ?? 0,
        next_change_date: input.nextChangeDate || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating control:', error);
      throw new Error(`No se pudo registrar el mantenimiento de control: ${error.message}`);
    }

    // Regla de negocio requerida: Actualizar valor estimado del evento en la tabla 'eventos'
    try {
      await supabase
        .from('eventos')
        .update({ estimated_value: input.unitValue })
        .eq('id', input.eventoId);
    } catch (updateErr) {
      console.warn('Error updating estimated_value on eventos:', updateErr);
    }

    return {
      id: data.id,
      date: data.date,
      eventoId: data.evento_id,
      vehiculoId: data.vehiculo_id,
      unitValue: Number(data.unit_value || 0),
      quantity: Number(data.quantity || 1),
      totalValue: Number(data.total_value || 0),
      currentMileage: Number(data.current_mileage || 0),
      nextChangeMileage: data.next_change_mileage ? Number(data.next_change_mileage) : undefined,
      nextChangeDate: data.next_change_date || undefined,
      createdAt: data.created_at,
    };
  },

  /**
   * Actualizar un mantenimiento de control existente y refrescar valor en eventos
   */
  async updateControl(id: string, input: UpdateControlInput): Promise<ControlEvento> {
    const totalVal = (input.unitValue ?? 0) * (input.quantity ?? 1);

    const { data, error } = await supabase
      .from('control')
      .update({
        date: input.date,
        evento_id: input.eventoId,
        vehiculo_id: input.vehiculoId,
        unit_value: input.unitValue,
        quantity: input.quantity,
        total_value: totalVal,
        current_mileage: input.currentMileage,
        next_change_mileage: input.nextChangeMileage ?? 0,
        next_change_date: input.nextChangeDate || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating control:', error);
      throw new Error(`No se pudo actualizar el registro de control: ${error.message}`);
    }

    // Actualizar valor en tabla eventos si se proporcionó eventoId y unitValue
    if (input.eventoId && input.unitValue !== undefined) {
      try {
        await supabase
          .from('eventos')
          .update({ estimated_value: input.unitValue })
          .eq('id', input.eventoId);
      } catch (updateErr) {
        console.warn('Error updating estimated_value on eventos:', updateErr);
      }
    }

    return {
      id: data.id,
      date: data.date,
      eventoId: data.evento_id,
      vehiculoId: data.vehiculo_id,
      unitValue: Number(data.unit_value || 0),
      quantity: Number(data.quantity || 1),
      totalValue: Number(data.total_value || 0),
      currentMileage: Number(data.current_mileage || 0),
      nextChangeMileage: data.next_change_mileage ? Number(data.next_change_mileage) : undefined,
      nextChangeDate: data.next_change_date || undefined,
      createdAt: data.created_at,
    };
  },

  /**
   * Eliminar registro de control
   */
  async deleteControl(id: string): Promise<void> {
    const { error } = await supabase.from('control').delete().eq('id', id);

    if (error) {
      console.error('Error deleting control:', error);
      throw new Error(`No se pudo eliminar el registro de control: ${error.message}`);
    }
  },
};
