import { supabase } from './supabase';
import { ProduccionDiaria, ProductionStatus, ShiftType, DriverSavingsSummary, STORAGE_KEYS } from '@maquitaxis/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SaveProduccionInput {
  vehiculoId: string;
  date: string; // Formato YYYY-MM-DD
  shift?: ShiftType; // 'dia' | 'noche'
  driverId?: string; // ID del conductor
  amount: number;
  deduction: number;
  status: ProductionStatus;
  mileage: number;
  savingsAmount: number;
}

export const produccionService = {
  /**
   * Obtiene la producción registrada para un vehículo, fecha y turno específico
   */
  async getProduccionByDate(vehiculoId: string, dateStr: string, shift: ShiftType = 'dia'): Promise<ProduccionDiaria | null> {
    try {
      const { data, error } = await supabase
        .from('produccion')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .eq('date', dateStr)
        .eq('shift', shift)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        vehiculoId: data.vehiculo_id,
        date: data.date,
        shift: (data.shift || 'dia') as ShiftType,
        driverId: data.driver_id || undefined,
        amount: Number(data.amount),
        deduction: Number(data.deduction),
        status: data.status as ProductionStatus,
        mileage: Number(data.mileage || 0),
        savingsAmount: Number(data.savings_amount || 0),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  },

  /**
   * Obtiene el historial de registros de producción diaria para un vehículo
   */
  async getProduccionHistory(vehiculoId: string, limit: number = 15): Promise<ProduccionDiaria[]> {
    try {
      const { data, error } = await supabase
        .from('produccion')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .order('date', { ascending: false })
        .order('shift', { ascending: true })
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        vehiculoId: item.vehiculo_id,
        date: item.date,
        shift: (item.shift || 'dia') as ShiftType,
        driverId: item.driver_id,
        amount: Number(item.amount),
        deduction: Number(item.deduction),
        status: item.status as ProductionStatus,
        mileage: Number(item.mileage || 0),
        savingsAmount: Number(item.savings_amount || 0),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch {
      return [];
    }
  },

  /**
   * Registra o actualiza la producción del turno para el vehículo (clave: vehiculo_id + date + shift)
   */
  async saveProduccion(input: SaveProduccionInput): Promise<ProduccionDiaria> {
    const shift = input.shift || 'dia';
    const payload = {
      vehiculo_id: input.vehiculoId,
      date: input.date,
      shift: shift,
      driver_id: input.driverId || null,
      amount: input.amount,
      deduction: input.deduction,
      status: input.status,
      mileage: input.mileage,
      savings_amount: input.savingsAmount,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('produccion')
        .upsert(payload, { onConflict: 'vehiculo_id, date, shift' })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Error al guardar el producido en Supabase.');
      }

      return {
        id: data.id,
        vehiculoId: data.vehiculo_id,
        date: data.date,
        shift: data.shift as ShiftType,
        driverId: data.driver_id || undefined,
        amount: Number(data.amount),
        deduction: Number(data.deduction),
        status: data.status as ProductionStatus,
        mileage: Number(data.mileage || 0),
        savingsAmount: Number(data.savings_amount || 0),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (err: any) {
      const offlineRecord: ProduccionDiaria = {
        id: `offline_prod_${Date.now()}`,
        vehiculoId: input.vehiculoId,
        date: input.date,
        shift: shift,
        driverId: input.driverId,
        amount: input.amount,
        deduction: input.deduction,
        status: input.status,
        mileage: input.mileage,
        savingsAmount: input.savingsAmount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveOfflineProduccion(offlineRecord);
      return offlineRecord;
    }
  },

  /**
   * Consultar el saldo acumulado de ahorro único del conductor en la app móvil
   */
  async getDriverSavingsSummary(driverId: string): Promise<DriverSavingsSummary> {
    try {
      const { data, error } = await supabase.rpc('get_driver_savings_summary', {
        p_driver_id: driverId,
      });

      if (error || !data) {
        return {
          driverId,
          driverName: 'Conductor',
          totalGenerated: 0,
          totalReturned: 0,
          availableBalance: 0,
        };
      }

      const row = Array.isArray(data) ? data[0] : data;
      return {
        driverId: row?.res_driver_id || driverId,
        driverName: row?.res_driver_name || 'Conductor',
        totalGenerated: Number(row?.res_total_generated || 0),
        totalReturned: Number(row?.res_total_returned || 0),
        availableBalance: Number(row?.res_available_balance || 0),
      };
    } catch {
      return {
        driverId,
        driverName: 'Conductor',
        totalGenerated: 0,
        totalReturned: 0,
        availableBalance: 0,
      };
    }
  },

  /**
   * Consultar los turnos asignados a un conductor en un vehículo específico
   */
  async getAssignedTurnos(vehiculoId: string, driverId: string): Promise<ShiftType[]> {
    try {
      const { data, error } = await supabase
        .from('vehiculo_turnos')
        .select('shift')
        .eq('vehiculo_id', vehiculoId)
        .eq('driver_id', driverId);

      if (error || !data || data.length === 0) {
        // Fallback: Si no existen turnos explícitos, habilitar 'dia' por compatibilidad
        return ['dia'];
      }

      return data.map((d: any) => (d.shift || 'dia') as ShiftType);
    } catch {
      return ['dia'];
    }
  },


  /**
   * Respaldo local en AsyncStorage para cuando no hay conexión
   */
  async saveOfflineProduccion(record: ProduccionDiaria): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(`${STORAGE_KEYS.OFFLINE_GPS_QUEUE}_prod`);
      const list: ProduccionDiaria[] = raw ? JSON.parse(raw) : [];
      list.push(record);
      await AsyncStorage.setItem(`${STORAGE_KEYS.OFFLINE_GPS_QUEUE}_prod`, JSON.stringify(list));
    } catch {
      // Ignorar errores de almacenamiento local
    }
  },
};
