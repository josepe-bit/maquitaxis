import { supabase } from './supabase';
import { ServicioApp, ServiceLevel, ServiceStatus } from '@maquitaxis/shared';

export interface CreateServicioAppInput {
  name: string;
  terceroId: string;
  level: ServiceLevel; // 1: Superusuario / Admin Global, 2: Empresa Contratante Nivel 2
  status: ServiceStatus;
  startDate: string;
  endDate?: string;
}

export interface UpdateServicioAppInput extends Partial<CreateServicioAppInput> {}

export interface ServicioAppWithStats extends ServicioApp {
  taxisCount: number;
}

interface RawServicioRow {
  id: string;
  name: string;
  tercero_id: string;
  status: ServiceStatus;
  start_date: string;
  end_date?: string;
  level: ServiceLevel;
  created_at: string;
  updated_at: string;
  tercero?: any;
}

export const servicioAppService = {
  mapRowToServicio(row: RawServicioRow): ServicioApp {
    return {
      id: row.id,
      name: row.name,
      terceroId: row.tercero_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      level: row.level,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tercero: row.tercero
        ? {
            id: row.tercero.id,
            docType: row.tercero.doc_type,
            docNumber: row.tercero.doc_number,
            name: row.tercero.name,
            phone: row.tercero.phone,
            email: row.tercero.email,
            isOwner: row.tercero.is_owner,
            isServiceClient: row.tercero.is_service_client,
            isDriver: row.tercero.is_driver,
            isSupplier: row.tercero.is_supplier,
            createdAt: row.tercero.created_at,
            updatedAt: row.tercero.updated_at,
          }
        : undefined,
    };
  },

  /**
   * Cargar la lista completa de Servicios de Suscripción con el conteo de taxis matriculados
   */
  async fetchServiciosWithStats(): Promise<ServicioAppWithStats[]> {
    const { data: serviciosData, error } = await supabase
      .from('servicios')
      .select('*, tercero:terceros!servicios_tercero_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (error || !serviciosData) return [];

    const rows = serviciosData as RawServicioRow[];

    // Consultar conteo de vehículos vinculados por servicio_id
    const { data: vehiculosData } = await supabase
      .from('vehiculos')
      .select('id, servicio_id');

    const countsMap: Record<string, number> = {};
    (vehiculosData || []).forEach((v) => {
      countsMap[v.servicio_id] = (countsMap[v.servicio_id] || 0) + 1;
    });

    return rows.map((row) => {
      const servicio = this.mapRowToServicio(row);
      return {
        ...servicio,
        taxisCount: countsMap[servicio.id] || 0,
      };
    });
  },

  /**
   * Cargar únicamente los servicios con estado 'activo' (para selector de matricular vehículo)
   */
  async fetchActiveServicios(): Promise<ServicioApp[]> {
    const { data, error } = await supabase
      .from('servicios')
      .select('*, tercero:terceros!servicios_tercero_id_fkey(*)')
      .eq('status', 'activo')
      .order('name', { ascending: true });

    if (error || !data) return [];
    return (data as RawServicioRow[]).map((row) => this.mapRowToServicio(row));
  },

  /**
   * Registrar un nuevo servicio de suscripción para una empresa / cliente contratante
   */
  async createServicioApp(input: CreateServicioAppInput): Promise<ServicioApp> {
    if (!input.name.trim()) {
      throw new Error('El nombre de la empresa / servicio es obligatorio.');
    }
    if (!input.terceroId) {
      throw new Error('Debe vincular un tercero representante de la empresa (cliente de servicio).');
    }

    // Garantizar que el tercero vinculado tenga el rol is_service_client = true
    await supabase
      .from('terceros')
      .update({ is_service_client: true })
      .eq('id', input.terceroId);

    const { data, error } = await supabase
      .from('servicios')
      .insert({
        name: input.name.trim(),
        tercero_id: input.terceroId,
        level: input.level || 2,
        status: input.status || 'activo',
        start_date: input.startDate || new Date().toISOString().substring(0, 10),
        end_date: input.endDate || null,
      })
      .select('*, tercero:terceros!servicios_tercero_id_fkey(*)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al crear el servicio de la empresa.');
    }

    return this.mapRowToServicio(data as RawServicioRow);
  },

  /**
   * Actualizar servicio de suscripción
   */
  async updateServicioApp(id: string, input: UpdateServicioAppInput): Promise<ServicioApp> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('servicios')
      .update({
        name: input.name?.trim(),
        tercero_id: input.terceroId,
        level: input.level,
        status: input.status,
        start_date: input.startDate,
        end_date: input.endDate || null,
        updated_at: now,
      })
      .eq('id', id)
      .select('*, tercero:terceros!servicios_tercero_id_fkey(*)')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al actualizar el servicio.');
    }

    return this.mapRowToServicio(data as RawServicioRow);
  },

  /**
   * Cambiar estado activo / inactivo de un servicio
   */
  async toggleServicioStatus(id: string, currentStatus: ServiceStatus): Promise<void> {
    const newStatus: ServiceStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    const { error } = await supabase
      .from('servicios')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'No se pudo cambiar el estado del servicio.');
    }
  },
};
