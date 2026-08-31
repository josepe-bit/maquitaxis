import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabaseClient } from '../services/supabaseClient';

export type UserRole = 'NIVEL_1' | 'NIVEL_2' | 'CONDUCTOR';

export interface UserPermissions {
  canAccessAll: boolean;
  allowedTabs: string[];
  canManageVehiculos: boolean;
  canManageTerceros: boolean;
  canManageServicios: boolean;
  canManageMarcas: boolean;
  canManageEventos: boolean;
  canViewProduccion: boolean;
  canViewHistory: boolean;
  canViewMap: boolean;
  canManageCarreras: boolean;
}

export interface TerceroData {
  id: string;
  user_id: string | null;
  doc_type: string;
  doc_number: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_owner: boolean;
  is_service_client: boolean;
  is_driver: boolean;
  is_supplier: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ServicioData {
  id: string;
  name: string;
  tercero_id: string;
  status: 'activo' | 'inactivo';
  level: number;
  start_date: string;
  end_date: string | null;
}

export interface RegisterInput {
  docNumber: string;
  docType?: string;
  name: string;
  phone?: string;
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  tercero: TerceroData | null;
  servicio: ServicioData | null;
  rol: UserRole | null;
  permisos: UserPermissions;
  loading: boolean;
  error: string | null;
  login: (docNumber: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (input: RegisterInput) => Promise<{ success: boolean; message?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; message?: string }>;
  resendVerificationEmail: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasPermission: (tabKey: string) => boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  canAccessAll: false,
  allowedTabs: [],
  canManageVehiculos: false,
  canManageTerceros: false,
  canManageServicios: false,
  canManageMarcas: false,
  canManageEventos: false,
  canViewProduccion: false,
  canViewHistory: false,
  canViewMap: false,
  canManageCarreras: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tercero, setTercero] = useState<TerceroData | null>(null);
  const [servicio, setServicio] = useState<ServicioData | null>(null);
  const [rol, setRol] = useState<UserRole | null>(null);
  const [permisos, setPermisos] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Calcular permisos según el rol asignado
  const calculatePermissions = (assignedRole: UserRole): UserPermissions => {
    switch (assignedRole) {
      case 'NIVEL_1':
        return {
          canAccessAll: true,
          allowedTabs: [
            'MAP_REALTIME',
            'SERVICIOS_APP',
            'CARRERAS',
            'VEHICULOS',
            'MARCAS',
            'EVENTOS',
            'CONTROL',
            'MANTENIMIENTO',
            'SSOCIAL',
            'LIQUIDACION',
            'TERCEROS',
            'PRODUCCION',
            'HISTORY_ROUTES',
          ],
          canManageVehiculos: true,
          canManageTerceros: true,
          canManageServicios: true,
          canManageMarcas: true,
          canManageEventos: true,
          canViewProduccion: true,
          canViewHistory: true,
          canViewMap: true,
          canManageCarreras: true,
        };
      case 'NIVEL_2':
        return {
          canAccessAll: false,
          allowedTabs: ['VEHICULOS', 'EVENTOS', 'CONTROL', 'MANTENIMIENTO', 'SSOCIAL', 'LIQUIDACION', 'PRODUCCION'],
          canManageVehiculos: true,
          canManageTerceros: false,
          canManageServicios: false,
          canManageMarcas: false,
          canManageEventos: true,
          canViewProduccion: true,
          canViewHistory: false,
          canViewMap: false,
          canManageCarreras: false,
        };
      case 'CONDUCTOR':
        return {
          canAccessAll: false,
          allowedTabs: ['MAP_REALTIME', 'PRODUCCION'],
          canManageVehiculos: false,
          canManageTerceros: false,
          canManageServicios: false,
          canManageMarcas: false,
          canManageEventos: false,
          canViewProduccion: true,
          canViewHistory: false,
          canViewMap: true,
          canManageCarreras: false,
        };
      default:
        return DEFAULT_PERMISSIONS;
    }
  };

  // Cargar perfil completo y validar rol tras autenticación
  const loadUserProfileAndRole = async (
    authUser: User,
    docNumberInput?: string
  ): Promise<{ success: boolean; message?: string; role?: UserRole }> => {
    try {
      // 1. Consultar la tabla terceros (por user_id o doc_number)
      let query = supabaseClient.from('terceros').select('*');
      if (docNumberInput && docNumberInput.trim() !== '') {
        query = query.eq('doc_number', docNumberInput.trim());
      } else {
        query = query.eq('user_id', authUser.id);
      }

      const { data: terceroRow, error: terceroErr } = await query.maybeSingle();

      if (terceroErr) {
        console.error('Error al consultar terceros:', terceroErr);
        await supabaseClient.auth.signOut();
        return { success: false, message: 'Error de base de datos al validar la cuenta del tercero.' };
      }

      if (!terceroRow) {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          message: 'Documento de identificación no registrado en la base de datos de MaquiTaxis.',
        };
      }

      // Validar que si se ingresó documento, coincida exactamente
      if (docNumberInput && docNumberInput.trim() !== '' && terceroRow.doc_number.trim() !== docNumberInput.trim()) {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          message: 'El documento de identificación no coincide con la cuenta ingresada.',
        };
      }

      // Vincular user_id en terceros si no está vinculado aún
      if (!terceroRow.user_id) {
        await supabaseClient.from('terceros').update({ user_id: authUser.id }).eq('id', terceroRow.id);
        terceroRow.user_id = authUser.id;
      }

      // 2. Consultar la tabla servicios vinculados al tercero (solo servicios activos)
      let { data: servicioRow, error: servicioErr } = await supabaseClient
        .from('servicios')
        .select('*')
        .eq('tercero_id', terceroRow.id)
        .eq('status', 'activo')
        .order('level', { ascending: true })
        .maybeSingle();

      if (servicioErr) {
        console.error('Error al consultar servicios:', servicioErr);
      }

      // Si no existe un servicio activo registrado para este tercero (o si la tabla servicios no tiene registros):
      // Permitir la creación automática del registro de servicio para otorgar el nivel correspondiente y evitar el bloqueo.
      if (!servicioRow) {
        const { count } = await supabaseClient
          .from('servicios')
          .select('*', { count: 'exact', head: true });

        // Si la tabla servicios no tiene registros en la base de datos (count === 0), asignamos Nivel 1 (Administrador)
        // De lo contrario, si es una nueva empresa / gestor, asignamos Nivel 2 (Gestor de Flota)
        const assignedLevel = (!count || count === 0) ? 1 : 2;
        const serviceName = assignedLevel === 1
          ? `Servicio Administrador - ${terceroRow.name}`
          : `Empresa de Afiliación - ${terceroRow.name}`;

        const today = new Date().toISOString().split('T')[0];

        const { data: newServicio, error: newServicioErr } = await supabaseClient
          .from('servicios')
          .insert({
            name: serviceName,
            tercero_id: terceroRow.id,
            status: 'activo',
            level: assignedLevel,
            start_date: today,
          })
          .select()
          .single();

        if (!newServicioErr && newServicio) {
          servicioRow = newServicio;
        } else {
          console.error('Error al auto-crear registro de servicio:', newServicioErr);
        }
      }

      let determinedRole: UserRole | null = null;
      let activeService: ServicioData | null = null;

      // 3. Determinación de Nivel y Rol
      if (servicioRow) {
        activeService = servicioRow as ServicioData;
        if (servicioRow.level === 1) {
          determinedRole = 'NIVEL_1'; // Administrador / Dueño total
        } else if (servicioRow.level === 2) {
          determinedRole = 'NIVEL_2'; // Gestor de Flota / Empresa de Afiliación
        }
      }

      // 4. Validación de Conductor si no tiene servicio activo de Nivel 1 o 2
      if (!determinedRole && terceroRow.is_driver) {
        determinedRole = 'CONDUCTOR';
      }

      // Si no cumple ninguna condición, rechazar acceso
      if (!determinedRole) {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          message: 'Acceso denegado: El usuario no posee un contrato de servicio activo ni rol de conductor asignado.',
        };
      }

      // Actualizar estado global
      setUser(authUser);
      setTercero(terceroRow as TerceroData);
      setServicio(activeService);
      setRol(determinedRole);
      setPermisos(calculatePermissions(determinedRole));
      setError(null);

      return { success: true, role: determinedRole };
    } catch (err: any) {
      console.error('Excepción al cargar perfil:', err);
      await supabaseClient.auth.signOut();
      return { success: false, message: err?.message || 'Ocurrió un error inesperado al procesar el login.' };
    }
  };

  // Inicialización de la sesión al montar el Provider
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (session?.user && isMounted) {
          await loadUserProfileAndRole(session.user);
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setTercero(null);
        setServicio(null);
        setRol(null);
        setPermisos(DEFAULT_PERMISSIONS);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Función de inicio de sesión público
  const login = async (docNumber: string, email: string, password: string) => {
    setLoading(true);
    setError(null);

    // Diagnóstico temporal seguro
    const urlRaw = import.meta.env.VITE_SUPABASE_URL;
    const keyRaw = import.meta.env.VITE_SUPABASE_ANON_KEY;
    let urlOrigin = 'NO_DISPONIBLE';
    try {
      if (urlRaw) urlOrigin = new URL(urlRaw).origin;
    } catch (_) {
      urlOrigin = 'URL_INVALIDA';
    }

    console.log('[DIAGNOSTICO LOGIN] VITE_SUPABASE_URL existe:', Boolean(urlRaw));
    console.log('[DIAGNOSTICO LOGIN] URL Origen:', urlOrigin);
    console.log('[DIAGNOSTICO LOGIN] VITE_SUPABASE_ANON_KEY existe:', Boolean(keyRaw));
    console.log('[DIAGNOSTICO LOGIN] ANON_KEY Longitud:', keyRaw ? keyRaw.length : 0);
    console.log('[DIAGNOSTICO LOGIN] typeof supabaseClient:', typeof supabaseClient);

    try {
      // a) Autenticación inicial mediante Supabase Auth
      const { data: authData, error: authErr } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authErr || !authData.user) {
        let errMsg = authErr?.message || 'Error al autenticar credenciales en Supabase.';
        if (authErr?.message === 'Invalid login credentials') {
          errMsg = 'Credenciales de acceso incorrectas. Revisa el correo y la contraseña.';
        } else if (
          authErr?.message?.toLowerCase().includes('email not confirmed') ||
          authErr?.message?.toLowerCase().includes('not_confirmed')
        ) {
          errMsg = 'Tu correo electrónico aún no ha sido verificado. Por favor revisa tu bandeja de entrada o haz clic abajo en "Reenviar correo de verificación".';
        }
        setError(errMsg);
        setLoading(false);
        return { success: false, message: errMsg };
      }

      // b) y c) Verificación en terceros y evaluación de rol
      const profileResult = await loadUserProfileAndRole(authData.user, docNumber);

      if (!profileResult.success) {
        setError(profileResult.message || 'Error de validación de perfil.');
        setLoading(false);
        return { success: false, message: profileResult.message };
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error('[DIAGNOSTICO LOGIN CATCH]', {
        error: err,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });
      const errMsg = err?.message || 'Error de conexión al iniciar sesión.';
      setError(errMsg);
      setLoading(false);
      return { success: false, message: errMsg };
    }
  };

  // Función de Registro de Nuevos Terceros y Usuarios Auth
  const register = async (input: RegisterInput) => {
    setLoading(true);
    setError(null);

    try {
      const docNumClean = input.docNumber.trim();
      const emailClean = input.email.trim();

      // 1. Verificación previa en la tabla terceros:
      // Si el documento YA está ingresado en terceros, se ACEPTA y se vincula el user_id (no se rechaza).
      const { data: existingDoc, error: docCheckErr } = await supabaseClient
        .from('terceros')
        .select('*')
        .eq('doc_number', docNumClean)
        .maybeSingle();

      if (docCheckErr) {
        console.error('Error al verificar documento en terceros:', docCheckErr);
      }

      // 2. Crear usuario en Supabase Auth
      const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
        email: emailClean,
        password: input.password,
      });

      if (authErr || !authData.user) {
        const msg = authErr?.message || 'Ocurrió un error al crear la cuenta en Supabase Auth.';
        setError(msg);
        setLoading(false);
        return { success: false, message: msg };
      }

      let terceroId: string;

      if (existingDoc) {
        // Aceptamos el tercero existente y actualizamos su user_id, email y teléfono
        const { data: updatedRows, error: updateErr } = await supabaseClient
          .from('terceros')
          .update({
            user_id: authData.user.id,
            email: emailClean,
            phone: input.phone?.trim() || existingDoc.phone,
            name: input.name.trim() || existingDoc.name,
            doc_type: input.docType || existingDoc.doc_type || 'CC',
          })
          .eq('id', existingDoc.id)
          .select();

        if (updateErr) {
          console.error('Error al vincular tercero existente:', updateErr);
          const msg = `Cuenta de Auth creada, pero no se pudo actualizar el tercero existente: ${updateErr.message}`;
          setError(msg);
          setLoading(false);
          return { success: false, message: msg };
        }

        if (updatedRows && updatedRows.length > 0) {
          terceroId = updatedRows[0].id;
        } else {
          terceroId = existingDoc.id;
        }
      } else {
        // Si no existe el documento, creamos el nuevo tercero
        const { data: newTercero, error: insertErr } = await supabaseClient
          .from('terceros')
          .insert({
            doc_type: input.docType || 'CC',
            doc_number: docNumClean,
            name: input.name.trim(),
            phone: input.phone?.trim() || null,
            email: emailClean,
            user_id: authData.user.id,
            is_owner: false,
            is_service_client: false,
            is_driver: true,
            is_supplier: false,
          })
          .select()
          .single();

        if (insertErr) {
          console.error('Error al insertar registro en terceros:', insertErr);
          const msg = `Cuenta de Auth creada, pero ocurrió un problema al guardar los datos en terceros: ${insertErr.message}`;
          setError(msg);
          setLoading(false);
          return { success: false, message: msg };
        }
        terceroId = newTercero.id;
      }

      // 3. Regla de Servicio Inicial:
      // Si NO hay registros en la tabla de servicios, el primer usuario creado debe crear el registro en la tabla de servicios con nivel 1.
      // De ahí en adelante ya no se crean más registros en la tabla servicios durante el registro.
      const { count: totalServicios } = await supabaseClient
        .from('servicios')
        .select('*', { count: 'exact', head: true });

      if (totalServicios === 0 || totalServicios === null) {
        const { error: servicioInsertErr } = await supabaseClient
          .from('servicios')
          .insert({
            name: `Suscripción Administrador - ${input.name.trim()}`,
            tercero_id: terceroId,
            level: 1,
            status: 'activo',
            start_date: new Date().toISOString().split('T')[0],
          });

        if (servicioInsertErr) {
          console.error('Error al crear servicio Nivel 1 inicial:', servicioInsertErr);
        }
      }

      setLoading(false);
      return {
        success: true,
        message: '¡Registro completado con éxito! Ahora puedes iniciar sesión con tus credenciales.',
      };
    } catch (err: any) {
      const msg = err?.message || 'Error inesperado durante el registro.';
      setError(msg);
      setLoading(false);
      return { success: false, message: msg };
    }
  };

  // Función para cambiar contraseña del usuario autenticado
  const changePassword = async (newPassword: string) => {
    setLoading(true);
    setError(null);
    try {
      if (!newPassword || newPassword.length < 6) {
        const msg = 'La nueva contraseña debe tener al menos 6 caracteres.';
        setError(msg);
        setLoading(false);
        return { success: false, message: msg };
      }

      const { error: updateAuthErr } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (updateAuthErr) {
        const msg = updateAuthErr.message || 'No se pudo cambiar la contraseña.';
        setError(msg);
        setLoading(false);
        return { success: false, message: msg };
      }

      setLoading(false);
      return { success: true, message: '¡Contraseña actualizada exitosamente!' };
    } catch (err: any) {
      const msg = err?.message || 'Error al cambiar la contraseña.';
      setError(msg);
      setLoading(false);
      return { success: false, message: msg };
    }
  };

  // Función para reenviar enlace de verificación de correo electrónico
  const resendVerificationEmail = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        const msg = 'Por favor ingresa un correo electrónico válido.';
        setError(msg);
        setLoading(false);
        return { success: false, message: msg };
      }

      const { error: resendErr } = await supabaseClient.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });

      if (resendErr) {
        const msg = resendErr.message || 'No se pudo reenviar el correo de verificación.';
        setError(msg);
        setLoading(false);
        return { success: false, message: msg };
      }

      setLoading(false);
      return {
        success: true,
        message: '¡Enlace de verificación enviado! Revisa tu bandeja de entrada o carpeta de correo no deseado.',
      };
    } catch (err: any) {
      const msg = err?.message || 'Error al solicitar el reenvío del correo de verificación.';
      setError(msg);
      setLoading(false);
      return { success: false, message: msg };
    }
  };

  // Función de cierre de sesión
  const logout = async () => {
    setLoading(true);
    try {
      await supabaseClient.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setUser(null);
      setTercero(null);
      setServicio(null);
      setRol(null);
      setPermisos(DEFAULT_PERMISSIONS);
      setError(null);
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const hasPermission = (tabKey: string) => {
    if (permisos.canAccessAll) return true;
    return permisos.allowedTabs.includes(tabKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tercero,
        servicio,
        rol,
        permisos,
        loading,
        error,
        login,
        register,
        changePassword,
        resendVerificationEmail,
        logout,
        clearError,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
