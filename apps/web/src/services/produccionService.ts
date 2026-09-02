import { supabase } from './supabase';
import {
  ProduccionDiaria,
  ProductionStatus,
  Vehiculo,
  LiquidacionConductor,
  ShiftType,
  VehiculoShift,
  DriverSavingsSummary,
} from '@maquitaxis/shared';

export interface CreateProduccionInput {
  vehiculoId: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType; // 'dia' | 'noche'
  driverId?: string; // Conductor asignado a la jornada
  status: ProductionStatus; // 'trabajo' | 'pico_y_placa' | 'taller' | 'descanso'
  amount: number; // Cuota del taxi (le queda al propietario)
  savingsAmount: number; // Ahorro personal del conductor (guardado por el propietario)
  deduction: number; // Deducción por gastos del taxi en el día
  mileage?: number; // Kilometraje final de la jornada
}

export interface UpdateProduccionInput extends Partial<CreateProduccionInput> {}

export const produccionService = {
  /**
   * Obtener turnos configurados para un vehículo (Día / Noche)
   */
  async fetchVehiculoTurnos(vehiculoId: string): Promise<VehiculoShift[]> {
    const { data, error } = await supabase
      .from('vehiculo_turnos')
      .select(`
        *,
        driver:terceros!vehiculo_turnos_driver_id_fkey (
          id,
          name,
          doc_number,
          phone,
          email
        )
      `)
      .eq('vehiculo_id', vehiculoId)
      .order('shift', { ascending: true });

    if (error) {
      console.error('Error fetching vehiculo_turnos:', error);
      return [];
    }

    return (data || []).map((vt: any) => ({
      id: vt.id,
      vehiculoId: vt.vehiculo_id,
      shift: vt.shift as ShiftType,
      driverId: vt.driver_id,
      dailyFee: Number(vt.daily_fee || 0),
      savingsAmount: Number(vt.savings_amount || 0),
      startTime: vt.start_time,
      endTime: vt.end_time,
      createdAt: vt.created_at,
      updatedAt: vt.updated_at,
      driver: vt.driver
        ? {
            id: vt.driver.id,
            name: vt.driver.name,
            docNumber: vt.driver.doc_number,
            phone: vt.driver.phone,
            email: vt.driver.email,
          } as any
        : undefined,
    }));
  },

  /**
   * Obtener lista de registros de producción diaria por vehículo, rango de fechas, turno o conductor
   */
  async fetchProducciones(
    vehiculoId?: string,
    startDate?: string,
    endDate?: string,
    shift?: ShiftType,
    driverId?: string
  ): Promise<ProduccionDiaria[]> {
    let query = supabase
      .from('produccion')
      .select(`
        *,
        driver:terceros!produccion_driver_id_fkey (
          id,
          name,
          doc_number
        ),
        vehiculo:vehiculos (
          id,
          plate,
          daily_fee,
          savings_amount,
          driver:terceros!vehiculos_driver_id_fkey (
            id,
            name,
            doc_number
          ),
          owner:terceros!vehiculos_owner_id_fkey (
            id,
            name
          )
        )
      `)
      .order('date', { ascending: false })
      .order('shift', { ascending: true });

    if (vehiculoId && vehiculoId.trim() !== '') {
      query = query.eq('vehiculo_id', vehiculoId);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }
    if (shift) {
      query = query.eq('shift', shift);
    }
    if (driverId && driverId.trim() !== '') {
      query = query.eq('driver_id', driverId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching producciones:', error);
      throw new Error(`Error al cargar registros de producción: ${error.message}`);
    }

    if (!data) return [];

    return data.map((p: any) => ({
      id: p.id,
      vehiculoId: p.vehiculo_id,
      date: p.date,
      shift: (p.shift || 'dia') as ShiftType,
      driverId: p.driver_id || undefined,
      amount: Number(p.amount || 0),
      deduction: Number(p.deduction || 0),
      status: p.status as ProductionStatus,
      mileage: p.mileage ? Number(p.mileage) : 0,
      savingsAmount: p.savings_amount ? Number(p.savings_amount) : 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      driver: p.driver
        ? ({
            id: p.driver.id,
            name: p.driver.name,
            docNumber: p.driver.doc_number,
            docType: 'CC',
            isOwner: false,
            isServiceClient: false,
            isDriver: true,
            isSupplier: false,
            createdAt: '',
            updatedAt: '',
          } as any)
        : undefined,
      vehiculo: p.vehiculo
        ? {
            id: p.vehiculo.id,
            plate: p.vehiculo.plate,
            dailyFee: Number(p.vehiculo.daily_fee || 0),
            savingsAmount: Number(p.vehiculo.savings_amount || 0),
            driver: p.vehiculo.driver
              ? { id: p.vehiculo.driver.id, name: p.vehiculo.driver.name, docNumber: p.vehiculo.driver.doc_number }
              : undefined,
            owner: p.vehiculo.owner ? { id: p.vehiculo.owner.id, name: p.vehiculo.owner.name } : undefined,
          } as any
        : undefined,
    }));

  },

  /**
   * Obtener vehículos activos para formularios de producción
   */
  async fetchVehiculosForProduction(): Promise<Vehiculo[]> {
    const { data, error } = await supabase
      .from('vehiculos')
      .select(`
        *,
        driver:terceros!vehiculos_driver_id_fkey (
          id,
          name,
          doc_number
        )
      `)
      .order('plate', { ascending: true });

    if (error) {
      console.error('Error fetching vehiculos for production:', error);
      throw new Error(`Error al cargar lista de taxis: ${error.message}`);
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
      driver: v.driver
        ? {
            id: v.driver.id,
            name: v.driver.name,
            docNumber: v.driver.doc_number,
          } as any
        : undefined,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));
  },

  /**
   * Registrar una nueva producción diaria asociando vehículo, fecha, turno y conductor
   */
  async createProduccion(input: CreateProduccionInput): Promise<ProduccionDiaria> {
    const isWorking = input.status === 'trabajo';
    const finalAmount = isWorking ? input.amount : 0;
    const finalSavings = isWorking ? input.savingsAmount : 0;
    const finalDeduction = isWorking ? input.deduction : 0;
    const shift = input.shift || 'dia';

    // Verificar si ya existe producción para la clave única (vehiculo_id + date + shift)
    const { data: existing } = await supabase
      .from('produccion')
      .select('id')
      .eq('vehiculo_id', input.vehiculoId)
      .eq('date', input.date)
      .eq('shift', shift)
      .maybeSingle();

    if (existing) {
      throw new Error(
        `Ya existe un registro de producción para este vehículo en la fecha ${input.date} para el turno ${shift.toUpperCase()}. Por favor edita el registro existente.`
      );
    }

    const { data, error } = await supabase
      .from('produccion')
      .insert({
        vehiculo_id: input.vehiculoId,
        date: input.date,
        shift: shift,
        driver_id: input.driverId || null,
        status: input.status,
        amount: finalAmount,
        savings_amount: finalSavings,
        deduction: finalDeduction,
        mileage: input.mileage || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating produccion:', error);
      throw new Error(`No se pudo guardar la producción diaria: ${error.message}`);
    }

    return {
      id: data.id,
      vehiculoId: data.vehiculo_id,
      date: data.date,
      shift: data.shift as ShiftType,
      driverId: data.driver_id || undefined,
      amount: Number(data.amount || 0),
      deduction: Number(data.deduction || 0),
      status: data.status as ProductionStatus,
      mileage: Number(data.mileage || 0),
      savingsAmount: Number(data.savings_amount || 0),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Actualizar un registro de producción diario
   */
  async updateProduccion(id: string, input: UpdateProduccionInput): Promise<ProduccionDiaria> {
    const isWorking = input.status === 'trabajo';
    const finalAmount = isWorking ? (input.amount ?? 0) : 0;
    const finalSavings = isWorking ? (input.savingsAmount ?? 0) : 0;
    const finalDeduction = isWorking ? (input.deduction ?? 0) : 0;

    const updateData: any = {
      status: input.status,
      amount: finalAmount,
      savings_amount: finalSavings,
      deduction: finalDeduction,
      mileage: input.mileage ?? 0,
      updated_at: new Date().toISOString(),
    };

    if (input.vehiculoId) updateData.vehiculo_id = input.vehiculoId;
    if (input.date) updateData.date = input.date;
    if (input.shift) updateData.shift = input.shift;
    if (input.driverId !== undefined) updateData.driver_id = input.driverId || null;

    const { data, error } = await supabase
      .from('produccion')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating produccion:', error);
      throw new Error(`No se pudo actualizar el registro de producción: ${error.message}`);
    }

    return {
      id: data.id,
      vehiculoId: data.vehiculo_id,
      date: data.date,
      shift: data.shift as ShiftType,
      driverId: data.driver_id || undefined,
      amount: Number(data.amount || 0),
      deduction: Number(data.deduction || 0),
      status: data.status as ProductionStatus,
      mileage: Number(data.mileage || 0),
      savingsAmount: Number(data.savings_amount || 0),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Eliminar un registro de producción
   */
  async deleteProduccion(id: string): Promise<void> {
    const { error } = await supabase.from('produccion').delete().eq('id', id);

    if (error) {
      console.error('Error deleting produccion:', error);
      throw new Error(`No se pudo eliminar el registro de producción: ${error.message}`);
    }
  },

  /**
   * Obtener resumen de saldo acumulado de ahorro del CONDUCTOR consumiendo la función SQL de la BD
   */
  async getDriverSavingsSummary(driverId: string): Promise<DriverSavingsSummary> {
    const { data, error } = await supabase.rpc('get_driver_savings_summary', {
      p_driver_id: driverId,
    });

    if (error) {
      console.error('Error in rpc get_driver_savings_summary:', error);
      throw new Error(`Error al consultar el saldo de ahorro del conductor: ${error.message}`);
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

    return {
      driverId: row.res_driver_id || driverId,
      driverName: row.res_driver_name || 'Conductor',
      totalGenerated: Number(row.res_total_generated || 0),
      totalReturned: Number(row.res_total_returned || 0),
      availableBalance: Number(row.res_available_balance || 0),
    };
  },

  /**
   * Registrar devolución de ahorro al conductor mediante la función RPC ATÓMICA en PostgreSQL
   */
  async registerDriverSavingsReturn(
    driverId: string,
    amount: number,
    notes?: string
  ): Promise<{ success: boolean; liquidacionId: string; newAvailableBalance: number }> {
    const { data, error } = await supabase.rpc('register_driver_savings_return', {
      p_driver_id: driverId,
      p_amount: amount,
      p_notes: notes || null,
    });

    if (error) {
      console.error('Error in rpc register_driver_savings_return:', error);
      throw new Error(error.message);
    }

    const res = typeof data === 'string' ? JSON.parse(data) : data;

    return {
      success: res.success,
      liquidacionId: res.liquidacion_id,
      newAvailableBalance: Number(res.new_available_balance || 0),
    };
  },
};
