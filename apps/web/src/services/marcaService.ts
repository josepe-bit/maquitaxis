import { supabase } from './supabase';
import { Marca, MarcaWithStats, CreateMarcaInput, UpdateMarcaInput } from '@maquitaxis/shared';

export const marcaService = {
  /**
   * Obtener todas las marcas registradas junto con el conteo de vehículos asociados
   */
  async fetchMarcasWithStats(): Promise<MarcaWithStats[]> {
    const { data: marcasData, error: marcasError } = await supabase
      .from('marcas')
      .select('*')
      .order('name', { ascending: true });

    if (marcasError) {
      console.error('Error fetching marcas:', marcasError);
      throw new Error(`Error al cargar marcas: ${marcasError.message}`);
    }

    if (!marcasData || marcasData.length === 0) {
      return [];
    }

    // Obtener estadísticas de vehículos por marca
    const { data: vehiculosData, error: vehiculosError } = await supabase
      .from('vehiculos')
      .select('marca_id');

    if (vehiculosError) {
      console.warn('Error fetching vehiculos count for marcas:', vehiculosError);
    }

    const countMap: Record<string, number> = {};
    if (vehiculosData) {
      vehiculosData.forEach((v: any) => {
        if (v.marca_id) {
          countMap[v.marca_id] = (countMap[v.marca_id] || 0) + 1;
        }
      });
    }

    return marcasData.map((m: any) => ({
      id: m.id,
      name: m.name,
      country: m.country || undefined,
      createdAt: m.created_at || undefined,
      vehiculosCount: countMap[m.id] || 0,
    }));
  },

  /**
   * Crear una nueva marca de vehículo
   */
  async createMarca(input: CreateMarcaInput): Promise<Marca> {
    const { data, error } = await supabase
      .from('marcas')
      .insert({
        name: input.name.trim(),
        country: input.country?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating marca:', error);
      if (error.code === '23505') {
        throw new Error(`La marca "${input.name}" ya se encuentra registrada en el sistema.`);
      }
      throw new Error(`No se pudo registrar la marca: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      country: data.country || undefined,
      createdAt: data.created_at || undefined,
    };
  },

  /**
   * Actualizar una marca existente
   */
  async updateMarca(id: string, input: UpdateMarcaInput): Promise<Marca> {
    const { data, error } = await supabase
      .from('marcas')
      .update({
        name: input.name.trim(),
        country: input.country?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating marca:', error);
      if (error.code === '23505') {
        throw new Error(`Ya existe otra marca con el nombre "${input.name}".`);
      }
      throw new Error(`No se pudo actualizar la marca: ${error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      country: data.country || undefined,
      createdAt: data.created_at || undefined,
    };
  },

  /**
   * Eliminar una marca si no tiene vehículos asociados
   */
  async deleteMarca(id: string): Promise<void> {
    // Validar si existen vehículos vinculados
    const { count, error: countError } = await supabase
      .from('vehiculos')
      .select('id', { count: 'exact', head: true })
      .eq('marca_id', id);

    if (countError) {
      console.warn('Error checking vehicles count for deletion:', countError);
    } else if (count && count > 0) {
      throw new Error(
        `No se puede eliminar la marca porque tiene ${count} vehículo(s) registrado(s) con esta marca. Reasigne los vehículos antes de eliminar.`
      );
    }

    const { error } = await supabase
      .from('marcas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting marca:', error);
      throw new Error(`No se pudo eliminar la marca: ${error.message}`);
    }
  },
};
