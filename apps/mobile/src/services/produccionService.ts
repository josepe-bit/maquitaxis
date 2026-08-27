import { supabase } from './supabase';
import { ProduccionDiaria, ProductionStatus, STORAGE_KEYS } from '@maquitaxis/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SaveProduccionInput {
  vehiculoId: string;
  date: string; // Formato YYYY-MM-DD
  amount: number;
  deduction: number;
  status: ProductionStatus;
  mileage: number;
  savingsAmount: number;
}

export const produccionService = {
  /**
   * Obtiene la producción registrada para un vehículo en una fecha específica (por defecto hoy)
   */
  async getProduccionByDate(vehiculoId: string, dateStr: string): Promise<ProduccionDiaria | null> {
    try {
      const { data, error } = await supabase
        .from('produccion')
        .select('*')
        .eq('vehiculo_id', vehiculoId)
        .eq('date', dateStr)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        vehiculoId: data.vehiculo_id,
        date: data.date,
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
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        vehiculoId: item.vehiculo_id,
        date: item.date,
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
   * Registra o actualiza la producción del día para el vehículo
   */
  async saveProduccion(input: SaveProduccionInput): Promise<ProduccionDiaria> {
    const payload = {
      vehiculo_id: input.vehiculoId,
      date: input.date,
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
        .upsert(payload, { onConflict: 'vehiculo_id, date' })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Error al guardar el producido en Supabase.');
      }

      return {
        id: data.id,
        vehiculoId: data.vehiculo_id,
        date: data.date,
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
