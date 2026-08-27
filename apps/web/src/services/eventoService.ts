import { supabase } from './supabase';
import { EventoCatalogo, EventoWithStats, CreateEventoInput, UpdateEventoInput, EventoAppliesBy } from '@maquitaxis/shared';

// Plantillas de eventos predefinidos para vehículos / taxis
export const DEFAULT_EVENT_TEMPLATES: CreateEventoInput[] = [
  {
    name: 'Cambio de Aceite y Filtro Motor',
    kmsInterval: 5000,
    monthsInterval: 6,
    appliesBy: 'kilometros_y_meses',
    estimatedValue: 150000,
  },
  {
    name: 'Revisión Técnico-Mecánica y Gases',
    kmsInterval: 0,
    monthsInterval: 12,
    appliesBy: 'meses',
    estimatedValue: 260000,
  },
  {
    name: 'Seguro Obligatorio de Accidentes (SOAT)',
    kmsInterval: 0,
    monthsInterval: 12,
    appliesBy: 'meses',
    estimatedValue: 650000,
  },
  {
    name: 'Cambio de Correa de Repartición / Tiempo',
    kmsInterval: 50000,
    monthsInterval: 24,
    appliesBy: 'kilometros_y_meses',
    estimatedValue: 350000,
  },
  {
    name: 'Cambio de Bujías de Encendido',
    kmsInterval: 20000,
    monthsInterval: 12,
    appliesBy: 'kilometros',
    estimatedValue: 90000,
  },
  {
    name: 'Cambio de Llantas (Juego Completo)',
    kmsInterval: 40000,
    monthsInterval: 18,
    appliesBy: 'kilometros_y_meses',
    estimatedValue: 800000,
  },
  {
    name: 'Revisión y Cambio Pastillas de Freno',
    kmsInterval: 15000,
    monthsInterval: 6,
    appliesBy: 'kilometros',
    estimatedValue: 120000,
  },
  {
    name: 'Mantenimiento General / Correctivo Taller',
    kmsInterval: 0,
    monthsInterval: 0,
    appliesBy: 'ninguno',
    estimatedValue: 200000,
  },
];

export const eventoService = {
  /**
   * Obtener todos los eventos del catálogo junto con el número de mantenimientos ejecutados en control
   */
  async fetchEventosWithStats(): Promise<EventoWithStats[]> {
    const { data: eventosData, error: eventosError } = await supabase
      .from('eventos')
      .select('*')
      .order('name', { ascending: true });

    if (eventosError) {
      console.error('Error fetching eventos:', eventosError);
      throw new Error(`Error al cargar catálogo de eventos: ${eventosError.message}`);
    }

    if (!eventosData || eventosData.length === 0) {
      return [];
    }

    // Obtener estadísticas de uso de eventos en la tabla control
    const { data: controlData, error: controlError } = await supabase
      .from('control')
      .select('evento_id');

    if (controlError) {
      console.warn('Error fetching control count for eventos:', controlError);
    }

    const countMap: Record<string, number> = {};
    if (controlData) {
      controlData.forEach((c: any) => {
        if (c.evento_id) {
          countMap[c.evento_id] = (countMap[c.evento_id] || 0) + 1;
        }
      });
    }

    return eventosData.map((e: any) => ({
      id: e.id,
      name: e.name,
      kmsInterval: e.kms_interval ?? 0,
      monthsInterval: e.months_interval ?? 0,
      appliesBy: (e.applies_by as EventoAppliesBy) || 'kilometros',
      estimatedValue: e.estimated_value ? Number(e.estimated_value) : 0,
      createdAt: e.created_at || undefined,
      controlsCount: countMap[e.id] || 0,
    }));
  },

  /**
   * Crear un nuevo evento en el catálogo
   */
  async createEvento(input: CreateEventoInput): Promise<EventoCatalogo> {
    const appliesBy: EventoAppliesBy = input.appliesBy || 'kilometros';

    const { data, error } = await supabase
      .from('eventos')
      .insert({
        name: input.name.trim(),
        kms_interval: (appliesBy === 'kilometros' || appliesBy === 'kilometros_y_meses') ? (input.kmsInterval ?? 0) : 0,
        months_interval: (appliesBy === 'meses' || appliesBy === 'kilometros_y_meses') ? (input.monthsInterval ?? 0) : 0,
        applies_by: appliesBy,
        estimated_value: input.estimatedValue ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating evento:', error);
      if (error.code === '23505') {
        throw new Error(`El evento "${input.name}" ya existe en el catálogo.`);
      }
      throw new Error(`No se pudo registrar el evento: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      kmsInterval: data.kms_interval ?? 0,
      monthsInterval: data.months_interval ?? 0,
      appliesBy: (data.applies_by as EventoAppliesBy) || 'kilometros',
      estimatedValue: data.estimated_value ? Number(data.estimated_value) : 0,
      createdAt: data.created_at || undefined,
    };
  },

  /**
   * Actualizar un evento existente
   */
  async updateEvento(id: string, input: UpdateEventoInput): Promise<EventoCatalogo> {
    const appliesBy: EventoAppliesBy = input.appliesBy || 'kilometros';

    const { data, error } = await supabase
      .from('eventos')
      .update({
        name: input.name.trim(),
        kms_interval: (appliesBy === 'kilometros' || appliesBy === 'kilometros_y_meses') ? (input.kmsInterval ?? 0) : 0,
        months_interval: (appliesBy === 'meses' || appliesBy === 'kilometros_y_meses') ? (input.monthsInterval ?? 0) : 0,
        applies_by: appliesBy,
        estimated_value: input.estimatedValue ?? 0,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating evento:', error);
      if (error.code === '23505') {
        throw new Error(`Ya existe otro evento registrado con el nombre "${input.name}".`);
      }
      throw new Error(`No se pudo actualizar el evento: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      kmsInterval: data.kms_interval ?? 0,
      monthsInterval: data.months_interval ?? 0,
      appliesBy: (data.applies_by as EventoAppliesBy) || 'kilometros',
      estimatedValue: data.estimated_value ? Number(data.estimated_value) : 0,
      createdAt: data.created_at || undefined,
    };
  },

  /**
   * Eliminar un evento si no tiene registros de control asociados
   */
  async deleteEvento(id: string): Promise<void> {
    const { count: controlCount, error: controlError } = await supabase
      .from('control')
      .select('id', { count: 'exact', head: true })
      .eq('evento_id', id);

    if (controlError) {
      console.warn('Error checking control records for event deletion:', controlError);
    } else if (controlCount && controlCount > 0) {
      throw new Error(
        `No se puede eliminar el evento porque se encuentra asociado a ${controlCount} registro(s) de control de mantenimiento de vehículos.`
      );
    }

    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting evento:', error);
      throw new Error(`No se pudo eliminar el evento: ${error.message}`);
    }
  },

  /**
   * Cargar eventos por defecto / plantillas sugeridas si el catálogo está vacío o el usuario lo solicita
   */
  async seedDefaultEventos(): Promise<number> {
    let createdCount = 0;
    for (const template of DEFAULT_EVENT_TEMPLATES) {
      try {
        await this.createEvento(template);
        createdCount++;
      } catch (err: any) {
        // Ignorar duplicados si ya existen
      }
    }
    return createdCount;
  },
};
