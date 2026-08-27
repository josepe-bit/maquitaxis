import { supabase } from './supabase';
import { Tercero, Vehiculo } from '@maquitaxis/shared';

export interface AuthDriverState {
  tercero: Tercero;
  vehiculo: Vehiculo | null;
}

/**
 * Servicio de autenticación para conductores por documento/email y contraseña
 */
export const authDriverService = {
  /**
   * Inicia sesión buscando primero el documento del tercero
   */
  async loginWithDocument(docNumber: string, password: string): Promise<AuthDriverState> {
    const cleanDoc = docNumber.trim();
    if (!cleanDoc) {
      throw new Error('El número de documento es obligatorio.');
    }
    if (!password) {
      throw new Error('La contraseña es obligatoria.');
    }

    // 1. Buscar tercero por número de documento
    const { data: tercero, error: terceroError } = await supabase
      .from('terceros')
      .select('*')
      .eq('doc_number', cleanDoc)
      .single();

    if (terceroError || !tercero) {
      throw new Error('No se encontró ningún tercero registrado con ese número de documento.');
    }

    if (!tercero.is_driver && !tercero.is_owner) {
      throw new Error('El tercero registrado no posee permisos de conductor.');
    }

    // Usar email del tercero para Supabase Auth si existe, o correo formateado por documento
    const userEmail = tercero.email || `doc_${cleanDoc}@maquitaxis.local`;

    // 2. Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (authError) {
      throw new Error(`Error de autenticación: ${authError.message}`);
    }

    // 3. Consultar vehículo asignado al conductor
    const vehiculo = await this.fetchAssignedVehicle(tercero.id);

    return {
      tercero: {
        id: tercero.id,
        userId: authData.user?.id || tercero.user_id || undefined,
        docType: tercero.doc_type,
        docNumber: tercero.doc_number,
        name: tercero.name,
        phone: tercero.phone || undefined,
        address: tercero.address || undefined,
        email: tercero.email || undefined,
        driverLicenseNumber: tercero.driver_license_number || undefined,
        isOwner: tercero.is_owner,
        isServiceClient: tercero.is_service_client,
        isDriver: tercero.is_driver,
        isSupplier: tercero.is_supplier,
        createdAt: tercero.created_at,
        updatedAt: tercero.updated_at,
      },
      vehiculo,
    };
  },

  /**
   * Obtiene el estado del conductor autenticado mediante user_id de la sesión de Supabase Auth
   */
  async getCurrentDriverState(): Promise<AuthDriverState | null> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return null;
    }

    const userId = sessionData.session.user.id;

    // Buscar tercero por user_id
    const { data: tercero, error } = await supabase
      .from('terceros')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !tercero) {
      return null;
    }

    if (!tercero.is_driver && !tercero.is_owner) {
      return null;
    }

    const vehiculo = await this.fetchAssignedVehicle(tercero.id);

    return {
      tercero: {
        id: tercero.id,
        userId: tercero.user_id || undefined,
        docType: tercero.doc_type,
        docNumber: tercero.doc_number,
        name: tercero.name,
        phone: tercero.phone || undefined,
        address: tercero.address || undefined,
        email: tercero.email || undefined,
        driverLicenseNumber: tercero.driver_license_number || undefined,
        isOwner: tercero.is_owner,
        isServiceClient: tercero.is_service_client,
        isDriver: tercero.is_driver,
        isSupplier: tercero.is_supplier,
        createdAt: tercero.created_at,
        updatedAt: tercero.updated_at,
      },
      vehiculo,
    };
  },

  /**
   * Obtener vehículo asignado al tercero/conductor (vehiculos.driver_id = tercero.id)
   */
  async fetchAssignedVehicle(terceroId: string): Promise<Vehiculo | null> {
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('driver_id', terceroId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      plate: data.plate,
      ownerId: data.owner_id || '',
      servicioId: data.servicio_id || '',
      model: data.model || '',
      displacement: data.displacement || undefined,
      fuelType: data.fuel_type || undefined,
      passengerCapacity: data.passenger_capacity || undefined,
      dailyFee: Number(data.daily_fee),
      savingsAmount: Number(data.savings_amount),
      status: data.status,
      lastKnownLat: data.last_known_lat || undefined,
      lastKnownLng: data.last_known_lng || undefined,
      lastLocationAt: data.last_location_at || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Reenviar enlace de verificación de correo electrónico
   */
  async resendVerificationEmail(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('Por favor ingresa un correo electrónico válido.');
    }
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    if (error) {
      throw new Error(`No se pudo reenviar el correo: ${error.message}`);
    }
  },

  /**
   * Cambiar contraseña del conductor autenticado
   */
  async changePassword(newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(`No se pudo actualizar la contraseña: ${error.message}`);
    }
  },

  /**
   * Cierre de sesión del conductor
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },
};
