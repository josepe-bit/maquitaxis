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
  access_status?: 'pending' | 'approved' | 'rejected';
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
  role: UserRole;
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
  approveUser: (terceroId: string) => Promise<{ success: boolean; message?: string }>;
  rejectUser: (terceroId: string) => Promise<{ success: boolean; message?: string }>;
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
          allowedTabs: ['MAP_REALTIME', 'PRODUCCION', 'CARRERAS'],
          canManageVehiculos: false,
          canManageTerceros: false,
          canManageServicios: false,
          canManageMarcas: false,
          canManageEventos: false,
          canViewProduccion: true,
          canViewHistory: false,
          canViewMap: true,
          canManageCarreras: true,
        };
      default:
        return DEFAULT_PERMISSIONS;
    }
  };

  // Cargar Perfil de Tercero y Nivel de Servicio
  const loadUserProfileAndRole = async (
    authUser: User,
    docNumberInput?: string
  ): Promise<{ success: boolean; message?: string; role?: UserRole }> => {
    try {
      // 1. Validar si el correo del usuario fue verificado en Supabase Auth
      if (!authUser.email_confirmed_at) {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          message: 'Debes confirmar tu correo electrónico antes de ingresar.',
        };
      }

      // 2. Consultar la tabla terceros por user_id
      let { data: terceroRow, error: terceroErr } = await supabaseClient
        .from('terceros')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (terceroErr) {
        console.error('Error al consultar terceros por user_id:', terceroErr);
      }

      // Si el tercero no existe aún para este authUser.id, invocar setup_user_profile_on_first_login con la metadata del registro
      if (!terceroRow) {
        const meta = authUser.user_metadata || {};
        const docNum = meta.docNumber || docNumberInput || '';
        const docType = meta.docType || 'CC';
        const name = meta.name || authUser.email?.split('@')[0] || 'Usuario';
        const phone = meta.phone || '';
        const role = meta.role || 'CONDUCTOR';

        if (docNum) {
          const { error: rpcErr } = await supabaseClient.rpc('setup_user_profile_on_first_login', {
            p_doc_type: docType,
            p_doc_number: docNum,
            p_name: name,
            p_phone: phone,
            p_role: role,
          });

          if (rpcErr) {
            console.error('Error en setup_user_profile_on_first_login:', rpcErr);
            await supabaseClient.auth.signOut();
            return { success: false, message: rpcErr.message };
          }

          // Consultar nuevamente el tercero recién creado/vinculado
          const { data: newlyCreated } = await supabaseClient
            .from('terceros')
            .select('*')
            .eq('user_id', authUser.id)
            .maybeSingle();

          terceroRow = newlyCreated;
        }
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

      // 3. Validar Estado de Aprobación de Acceso (access_status)
      const currentAccessStatus = terceroRow.access_status || 'pending';

      if (currentAccessStatus === 'pending') {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          message: 'Tu cuenta está pendiente de aprobación por el administrador.',
        };
      }

      if (currentAccessStatus === 'rejected') {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          message: 'Tu acceso a MaquiTaxis no está autorizado. Comunícate con el administrador.',
        };
      }

      // 4. Consultar la tabla servicios vinculados al tercero (solo servicios activos)
      const { data: servicioRow, error: servicioErr } = await supabaseClient
        .from('servicios')
        .select('*')
        .eq('tercero_id', terceroRow.id)
        .eq('status', 'activo')
        .order('level', { ascending: true })
        .maybeSingle();

      if (servicioErr) {
        console.error('Error al consultar servicios:', servicioErr);
      }

      let determinedRole: UserRole | null = null;
      let activeService: ServicioData | null = null;

      // 5. Determinación estricta de Nivel y Rol
      if (servicioRow) {
        activeService = servicioRow as ServicioData;
        if (servicioRow.level === 1) {
          determinedRole = 'NIVEL_1'; // Administrador / SuperAdmin
        } else if (servicioRow.level === 2) {
          determinedRole = 'NIVEL_2'; // Gestor de Flota / Empresa
        }
      }

      // Si no posee servicio activo pero tiene is_driver = true, es Conductor
      if (!determinedRole && terceroRow.is_driver) {
        determinedRole = 'CONDUCTOR';
      }

      // Si no cumple ninguna condición, rechazar acceso
      if (!determinedRole) {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          message: 'Acceso denegado: El usuario no posee un servicio activo ni rol de conductor asignado.',
        };
      }

      // Actualizar estado global
      setUser(authUser);
      setTercero(terceroRow as TerceroData);
      setServicio(activeService);
      setRol(determinedRole);
      setPermisos(calculatePermissions(determinedRole));

      return { success: true, role: determinedRole };
    } catch (err: any) {
      console.error('Error inesperado al cargar perfil:', err);
      await supabaseClient.auth.signOut();
      return {
        success: false,
        message: err?.message || 'Ocurrió un error inesperado al validar el perfil de usuario.',
      };
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
      const errMsg = err?.message || 'Error de conexión al iniciar sesión.';
      setError(errMsg);
      setLoading(false);
      return { success: false, message: errMsg };
    }
  };

  // Función de Registro de Nuevos Terceros y Usuarios Auth (Solo guarda metadata)
  const register = async (input: RegisterInput) => {
    setLoading(true);
    setError(null);

    try {
      const docNumClean = input.docNumber.trim();
      const emailClean = input.email.trim();

      // Crear usuario en Supabase Auth guardando la solicitud en user_metadata
      const { data: authData, error: authErr } = await supabaseClient.auth.signUp({
        email: emailClean,
        password: input.password,
        options: {
          data: {
            role: input.role,
            docNumber: docNumClean,
            name: input.name.trim(),
            phone: input.phone?.trim() || '',
            docType: input.docType || 'CC',
          },
        },
      });

      if (authErr || !authData.user) {
        const msg = authErr?.message || 'Ocurrió un error al crear la cuenta en Supabase Auth.';
        setError(msg);
        setLoading(false);
        return { success: false, message: msg };
      }

      setLoading(false);
      return {
        success: true,
        message: '¡Registro completado con éxito! Por favor confirma tu correo electrónico y espera la aprobación del Administrador.',
      };
    } catch (err: any) {
      const msg = err?.message || 'Error inesperado durante el registro.';
      setError(msg);
      setLoading(false);
      return { success: false, message: msg };
    }
  };

  // Aprobar acceso de un usuario (Solo Administrador Nivel 1)
  const approveUser = async (terceroId: string, approvedRole: UserRole = 'CONDUCTOR'): Promise<{ success: boolean; message?: string }> => {
    try {
      if (rol !== 'NIVEL_1') {
        return { success: false, message: 'Solo un Administrador Nivel 1 puede aprobar usuarios.' };
      }

      const { data: rpcData, error: rpcErr } = await supabaseClient
        .rpc('approve_user_by_admin', {
          p_target_tercero_id: terceroId,
          p_approved_role: approvedRole,
        });

      if (rpcErr) {
        console.error('Error al aprobar usuario via RPC:', rpcErr);
        return { success: false, message: rpcErr.message };
      }

      return { success: true, message: (rpcData as any)?.message || 'Usuario aprobado exitosamente.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al aprobar usuario.' };
    }
  };

  // Rechazar / Desactivar acceso de un usuario (Solo Administrador Nivel 1)
  const rejectUser = async (terceroId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (rol !== 'NIVEL_1') {
        return { success: false, message: 'Solo un Administrador Nivel 1 puede rechazar o desactivar usuarios.' };
      }

      const { error: updateErr } = await supabaseClient
        .from('terceros')
        .update({ access_status: 'rejected' })
        .eq('id', terceroId);

      if (updateErr) {
        console.error('Error al rechazar usuario:', updateErr);
        return { success: false, message: updateErr.message };
      }

      // Si el tercero tiene un servicio registrado, inactivarlo
      await supabaseClient
        .from('servicios')
        .update({ status: 'inactivo' })
        .eq('tercero_id', terceroId);

      return { success: true, message: 'Acceso de usuario desactivado.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error al rechazar usuario.' };
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
        approveUser,
        rejectUser,
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
