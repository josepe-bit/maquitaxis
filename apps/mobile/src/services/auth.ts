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
   * Inicia sesión llamando a la Edge Function de autenticación por documento
   */
  async loginWithDocument(docNumber: string, password: string): Promise<AuthDriverState> {
    const cleanDoc = docNumber.trim();
    if (!cleanDoc) {
      throw new Error('El número de documento es obligatorio.');
    }
    if (!password) {
      throw new Error('La contraseña es obligatoria.');
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('No se encontró la configuración de conexión con el servidor.');
    }

    let response: Response;
    try {
      response = await fetch(`${supabaseUrl}/functions/v1/mobile-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          docNumber: cleanDoc,
          password: password,
        }),
      });
    } catch (err: any) {
      throw new Error('Error de conexión con el servidor. Comprueba tu conexión a internet.');
    }

    if (!response.ok) {
      throw new Error('Credenciales de acceso inválidas. Verifica tu documento y contraseña.');
    }

    const data = await response.json().catch(() => ({}));
    if (!data.session?.access_token || !data.session?.refresh_token) {
      throw new Error('Credenciales de acceso inválidas. Verifica tu documento y contraseña.');
    }

    // Establecer la sesión oficialmente en el SDK de Supabase (guarda en AsyncStorage)
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (sessionError) {
      throw new Error(`Error al iniciar la sesión: ${sessionError.message}`);
    }

    // Obtener el estado del conductor autenticado
    const driverState = await this.getCurrentDriverState();
    if (!driverState) {
      throw new Error('No fue posible obtener el perfil del conductor autenticado.');
    }

    return driverState;
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
