import { supabase } from './supabase';
import { MantenimientoTaller, CreateMantenimientoInput, UpdateMantenimientoInput, Tercero, Vehiculo } from '@maquitaxis/shared';

export const mantenimientoService = {
  /**
   * Obtener lista de mantenimientos en talleres y proveedores
   */
  async fetchMantenimientos(vehiculoId?: string, supplierId?: string): Promise<MantenimientoTaller[]> {
    let query = supabase
      .from('mantenimiento')
      .select(`
        *,
        supplier:terceros!mantenimiento_supplier_id_fkey (
          id,
          name,
          doc_number,
          phone,
          email
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
    if (supplierId && supplierId.trim() !== '') {
      query = query.eq('supplier_id', supplierId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching mantenimientos:', error);
      throw new Error(`Error al cargar registros de mantenimiento de taller: ${error.message}`);
    }

    if (!data) return [];

    return data.map((m: any) => ({
      id: m.id,
      date: m.date,
      vehiculoId: m.vehiculo_id,
      supplierId: m.supplier_id,
      detail: m.detail,
      totalValue: Number(m.total_value || 0),
      currentMileage: Number(m.current_mileage || 0),
      createdAt: m.created_at,
      supplier: m.supplier
        ? ({
            id: m.supplier.id,
            name: m.supplier.name,
            docNumber: m.supplier.doc_number,
            phone: m.supplier.phone,
            email: m.supplier.email,
          } as any)
        : undefined,
      vehiculo: m.vehiculo
        ? ({
            id: m.vehiculo.id,
            plate: m.vehiculo.plate,
            model: m.vehiculo.model,
            driver: m.vehiculo.driver ? { name: m.vehiculo.driver.name } : undefined,
          } as any)
        : undefined,
    }));
  },

  /**
   * Obtener proveedores/talleres registrados (is_supplier = true)
   */
  async fetchSuppliers(): Promise<Tercero[]> {
    const { data, error } = await supabase
      .from('terceros')
      .select('*')
      .eq('is_supplier', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error(`Error al consultar lista de talleres/proveedores: ${error.message}`);
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
   * Obtener vehículos para el selector
   */
  async fetchVehiculos(): Promise<Vehiculo[]> {
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
      console.error('Error fetching vehiculos for mantenimiento:', error);
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
   * Registrar un nuevo mantenimiento en taller
   */
  async createMantenimiento(input: CreateMantenimientoInput): Promise<MantenimientoTaller> {
    const { data, error } = await supabase
      .from('mantenimiento')
      .insert({
        date: input.date,
        vehiculo_id: input.vehiculoId,
        supplier_id: input.supplierId,
        detail: input.detail,
        total_value: input.totalValue,
        current_mileage: input.currentMileage,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating mantenimiento:', error);
      throw new Error(`No se pudo registrar el mantenimiento de taller: ${error.message}`);
    }

    return {
      id: data.id,
      date: data.date,
      vehiculoId: data.vehiculo_id,
      supplierId: data.supplier_id,
      detail: data.detail,
      totalValue: Number(data.total_value || 0),
      currentMileage: Number(data.current_mileage || 0),
      createdAt: data.created_at,
    };
  },

  /**
   * Actualizar mantenimiento de taller
   */
  async updateMantenimiento(id: string, input: UpdateMantenimientoInput): Promise<MantenimientoTaller> {
    const { data, error } = await supabase
      .from('mantenimiento')
      .update({
        date: input.date,
        vehiculo_id: input.vehiculoId,
        supplier_id: input.supplierId,
        detail: input.detail,
        total_value: input.totalValue,
        current_mileage: input.currentMileage,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mantenimiento:', error);
      throw new Error(`No se pudo actualizar el mantenimiento: ${error.message}`);
    }

    return {
      id: data.id,
      date: data.date,
      vehiculoId: data.vehiculo_id,
      supplierId: data.supplier_id,
      detail: data.detail,
      totalValue: Number(data.total_value || 0),
      currentMileage: Number(data.current_mileage || 0),
      createdAt: data.created_at,
    };
  },

  /**
   * Eliminar mantenimiento
   */
  async deleteMantenimiento(id: string): Promise<void> {
    const { error } = await supabase.from('mantenimiento').delete().eq('id', id);

    if (error) {
      console.error('Error deleting mantenimiento:', error);
      throw new Error(`No se pudo eliminar el mantenimiento: ${error.message}`);
    }
  },
};
