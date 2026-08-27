import { supabase } from './supabase';
import { ProduccionDiaria, ProductionStatus, Vehiculo, LiquidacionConductor } from '@maquitaxis/shared';

export interface CreateProduccionInput {
  vehiculoId: string;
  date: string; // YYYY-MM-DD
  status: ProductionStatus; // 'trabajo' | 'pico_y_placa' | 'taller' | 'descanso'
  amount: number; // Cuota del taxi (le queda al propietario)
  savingsAmount: number; // Ahorro personal del conductor (guardado por el propietario)
  deduction: number; // Deducción por gastos del taxi en el día
  mileage?: number; // Kilometraje final de la jornada
}

export interface UpdateProduccionInput extends Partial<CreateProduccionInput> {}

export interface SavingsSummaryResult {
  driverTerceroId?: string;
  driverName?: string;
  vehiculoPlate?: string;
  fromDate: string;
  toDate: string;
  totalDaysWorked: number;
  totalBaseCuotas: number;
  totalSavingsAmount: number; // Ahorro acumulado a devolver
  totalDeductions: number;
  netDeliveredCash: number; // (Cuotas + Ahorro) - Deducciones
  recordsCount: number;
}

export const produccionService = {
  /**
   * Obtener lista de registros de producción diaria con información del vehículo y conductor
   */
  async fetchProducciones(vehiculoId?: string, startDate?: string, endDate?: string): Promise<ProduccionDiaria[]> {
    let query = supabase
      .from('produccion')
      .select(`
        *,
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
      .order('date', { ascending: false });

    if (vehiculoId && vehiculoId.trim() !== '') {
      query = query.eq('vehiculo_id', vehiculoId);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
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
      amount: Number(p.amount || 0),
      deduction: Number(p.deduction || 0),
      status: p.status as ProductionStatus,
      mileage: p.mileage ? Number(p.mileage) : 0,
      savingsAmount: p.savings_amount ? Number(p.savings_amount) : 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
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
   * Obtener vehículos activos con su cuota y ahorro configurados
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
   * Registrar una nueva producción diaria
   */
  async createProduccion(input: CreateProduccionInput): Promise<ProduccionDiaria> {
    const isWorking = input.status === 'trabajo';
    const finalAmount = isWorking ? input.amount : 0;
    const finalSavings = isWorking ? input.savingsAmount : 0;
    const finalDeduction = isWorking ? input.deduction : 0;

    // Verificar si ya existe un registro de producción para el mismo vehículo y fecha
    const { data: existing } = await supabase
      .from('produccion')
      .select('id')
      .eq('vehiculo_id', input.vehiculoId)
      .eq('date', input.date)
      .maybeSingle();

    if (existing) {
      throw new Error(
        `Ya existe un registro de producción guardado para este vehículo en la fecha ${input.date}. Por favor edita el registro existente.`
      );
    }

    const { data, error } = await supabase
      .from('produccion')
      .insert({
        vehiculo_id: input.vehiculoId,
        date: input.date,
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

    const { data, error } = await supabase
      .from('produccion')
      .update({
        vehiculo_id: input.vehiculoId,
        date: input.date,
        status: input.status,
        amount: finalAmount,
        savings_amount: finalSavings,
        deduction: finalDeduction,
        mileage: input.mileage ?? 0,
        updated_at: new Date().toISOString(),
      })
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
   * Calcular resumen de ahorro acumulado de un conductor para devolución / liquidación entre fechas
   */
  async calculateSavingsSummary(
    vehiculoId: string,
    fromDate: string,
    toDate: string
  ): Promise<SavingsSummaryResult> {
    const { data: producciones, error } = await supabase
      .from('produccion')
      .select(`
        *,
        vehiculo:vehiculos (
          id,
          plate,
          driver:terceros!vehiculos_driver_id_fkey (
            id,
            name
          )
        )
      `)
      .eq('vehiculo_id', vehiculoId)
      .gte('date', fromDate)
      .lte('date', toDate);

    if (error) {
      console.error('Error calculating savings summary:', error);
      throw new Error(`Error al consultar ahorro acumulado: ${error.message}`);
    }

    if (!producciones || producciones.length === 0) {
      return {
        fromDate,
        toDate,
        totalDaysWorked: 0,
        totalBaseCuotas: 0,
        totalSavingsAmount: 0,
        totalDeductions: 0,
        netDeliveredCash: 0,
        recordsCount: 0,
      };
    }

    let totalWorked = 0;
    let totalCuotas = 0;
    let totalSavings = 0;
    let totalDeductions = 0;

    const sample = producciones[0];
    const driverName = sample?.vehiculo?.driver?.name || 'Desconocido';
    const driverId = sample?.vehiculo?.driver?.id;
    const plate = sample?.vehiculo?.plate;

    producciones.forEach((p: any) => {
      if (p.status === 'trabajo') {
        totalWorked++;
        totalCuotas += Number(p.amount || 0);
        totalSavings += Number(p.savings_amount || 0);
        totalDeductions += Number(p.deduction || 0);
      }
    });

    const netDelivered = (totalCuotas + totalSavings) - totalDeductions;

    return {
      driverTerceroId: driverId,
      driverName,
      vehiculoPlate: plate,
      fromDate,
      toDate,
      totalDaysWorked: totalWorked,
      totalBaseCuotas: totalCuotas,
      totalSavingsAmount: totalSavings,
      totalDeductions: totalDeductions,
      netDeliveredCash: netDelivered,
      recordsCount: producciones.length,
    };
  },

  /**
   * Registrar devolución de ahorro acumulado en la tabla liquidación
   */
  async registerLiquidacionAhorro(
    terceroId: string,
    fromDate: string,
    toDate: string,
    savingsAmount: number,
    notes?: string
  ): Promise<LiquidacionConductor> {
    const detailText = `Devolución de Ahorro Acumulado del Conductor: ${notes || ''} (Monto Devuelto: $${savingsAmount.toLocaleString('es-CO')})`;

    const { data, error } = await supabase
      .from('liquidacion')
      .insert({
        tercero_id: terceroId,
        payment_date: new Date().toISOString().split('T')[0],
        from_date: fromDate,
        to_date: toDate,
        detail: detailText,
        amount: savingsAmount,
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering liquidacion ahorro:', error);
      throw new Error(`No se pudo registrar la liquidación del ahorro: ${error.message}`);
    }

    return {
      id: data.id,
      terceroId: data.tercero_id,
      paymentDate: data.payment_date,
      fromDate: data.from_date,
      toDate: data.to_date,
      detail: data.detail,
      amount: Number(data.amount || savingsAmount),
      createdAt: data.created_at,
    };
  },
};
