import React, { useState } from 'react';
import {
  Car,
  Mail,
  Lock,
  FileText,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  ArrowRight,
  User,
  Phone,
  CheckCircle2,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';

type AuthMode = 'LOGIN' | 'REGISTER';

interface AuthViewProps {
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode = 'LOGIN', onSuccess }) => {
  const { login, register, resendVerificationEmail, error: globalError, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Formulario Login
  const [loginDocNumber, setLoginDocNumber] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Formulario Registro
  const [regRole, setRegRole] = useState<UserRole>('CONDUCTOR');
  const [regDocType, setRegDocType] = useState<string>('CC');
  const [regDocNumber, setRegDocNumber] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  // UI States
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleTabSwitch = (newMode: AuthMode) => {
    clearError();
    setLocalError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setMode(newMode);
  };

  // Validaciones del formulario de LOGIN
  const validateLoginForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!loginDocNumber.trim()) {
      errors.loginDocNumber = 'El número de identificación es obligatorio.';
    }

    if (!loginEmail.trim()) {
      errors.loginEmail = 'El correo electrónico es obligatorio.';
    } else if (!loginEmail.includes('@')) {
      errors.loginEmail = 'Ingresa un correo electrónico válido.';
    }

    if (!loginPassword) {
      errors.loginPassword = 'La contraseña es obligatoria.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validaciones del formulario de REGISTRO
  const validateRegisterForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!regDocNumber.trim()) {
      errors.regDocNumber = 'El número de identificación es obligatorio.';
    }

    if (!regName.trim()) {
      errors.regName = 'El nombre o razón social es obligatorio.';
    }

    if (!regEmail.trim()) {
      errors.regEmail = 'El correo electrónico es obligatorio.';
    } else if (!regEmail.includes('@')) {
      errors.regEmail = 'Ingresa un correo electrónico válido.';
    }

    if (!regPassword) {
      errors.regPassword = 'La contraseña es obligatoria.';
    } else if (regPassword.length < 6) {
      errors.regPassword = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (!regConfirmPassword) {
      errors.regConfirmPassword = 'Confirma tu contraseña.';
    } else if (regPassword !== regConfirmPassword) {
      errors.regConfirmPassword = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Envío del Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setSuccessMessage(null);

    if (!validateLoginForm()) return;

    setIsSubmitting(true);

    try {
      const result = await login(loginDocNumber.trim(), loginEmail.trim(), loginPassword);

      if (result.success) {
        if (onSuccess) onSuccess();
      } else {
        setLocalError(result.message || 'Error al iniciar sesión.');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Envío del Registro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setSuccessMessage(null);

    if (!validateRegisterForm()) return;

    setIsSubmitting(true);

    try {
      const result = await register({
        role: regRole,
        docType: regDocType,
        docNumber: regDocNumber.trim(),
        name: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        password: regPassword,
      });

      if (result.success) {
        setSuccessMessage('¡Registro exitoso! Ya puedes iniciar sesión con tus credenciales.');
        // Pre-poblar el formulario de login y alternar automáticamente a la pestaña Login
        setLoginDocNumber(regDocNumber.trim());
        setLoginEmail(regEmail.trim());
        setLoginPassword('');
        setMode('LOGIN');
      } else {
        setLocalError(result.message || 'No fue posible completar el registro.');
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Error al procesar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || globalError;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        backgroundImage: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 70%)',
        padding: '1.5rem',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.1)',
          padding: '2.25rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        {/* Encabezado e Identidad visual */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b',
              marginBottom: '0.25rem',
            }}
          >
            <Car size={34} />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Maqui<span style={{ color: '#f59e0b' }}>Taxis</span>
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
            Plataforma Integral de Gestión de Flotas y Taxis
          </p>
        </div>

        {/* Pestañas de Alternancia: Iniciar Sesión / Registrarse */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#0f172a',
            borderRadius: '10px',
            padding: '4px',
            border: '1px solid #334155',
          }}
        >
          <button
            type="button"
            onClick={() => handleTabSwitch('LOGIN')}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: mode === 'LOGIN' ? '#f59e0b' : 'transparent',
              color: mode === 'LOGIN' ? '#0f172a' : '#94a3b8',
              fontWeight: mode === 'LOGIN' ? '700' : '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            <LogIn size={16} />
            <span>Iniciar Sesión</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSwitch('REGISTER')}
            style={{
              flex: 1,
              padding: '0.65rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: mode === 'REGISTER' ? '#f59e0b' : 'transparent',
              color: mode === 'REGISTER' ? '#0f172a' : '#94a3b8',
              fontWeight: mode === 'REGISTER' ? '700' : '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            <UserPlus size={16} />
            <span>Registrarse</span>
          </button>
        </div>

        {/* Mensaje de Éxito Notificatorio */}
        {successMessage && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              color: '#34d399',
              fontSize: '0.85rem',
              lineHeight: '1.4',
            }}
          >
            <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Banner de Error */}
        {activeError && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              color: '#f87171',
              fontSize: '0.85rem',
              lineHeight: '1.4',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontWeight: '700', marginBottom: '2px' }}>
                {mode === 'LOGIN' ? 'Error al Iniciar Sesión' : 'Error al Registrarse'}
              </strong>
              <div>{activeError}</div>
              {(activeError.toLowerCase().includes('verificad') ||
                activeError.toLowerCase().includes('confirm') ||
                activeError.toLowerCase().includes('correo')) && (
                <button
                  type="button"
                  onClick={async () => {
                    const targetEmail = loginEmail.trim() || regEmail.trim();
                    if (!targetEmail || !targetEmail.includes('@')) {
                      setLocalError('Por favor ingresa tu correo electrónico arriba para reenviar el enlace.');
                      return;
                    }
                    setIsSubmitting(true);
                    const res = await resendVerificationEmail(targetEmail);
                    setIsSubmitting(false);
                    if (res.success) {
                      setSuccessMessage(res.message || 'Enlace de verificación enviado a tu correo.');
                      setLocalError(null);
                    } else {
                      setLocalError(res.message || 'No se pudo reenviar el correo.');
                    }
                  }}
                  style={{
                    marginTop: '0.6rem',
                    padding: '0.45rem 0.85rem',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid #38bdf8',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Mail size={14} />
                  <span>Reenviar Correo de Verificación</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODO 1: FORMULARIO DE LOGIN */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {/* Documento de Identificación */}
            <div>
              <label
                htmlFor="loginDocNumber"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
              >
                Documento de Identificación del Tercero <span style={{ color: '#f59e0b' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '0.875rem', color: fieldErrors.loginDocNumber ? '#f87171' : '#64748b' }}>
                  <FileText size={18} />
                </div>
                <input
                  id="loginDocNumber"
                  type="text"
                  value={loginDocNumber}
                  onChange={(e) => {
                    setLoginDocNumber(e.target.value);
                    if (fieldErrors.loginDocNumber) setFieldErrors((prev) => ({ ...prev, loginDocNumber: '' }));
                  }}
                  placeholder="Ej: 1098765432"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem 0.7rem 2.6rem',
                    backgroundColor: '#0f172a',
                    border: `1px solid ${fieldErrors.loginDocNumber ? '#ef4444' : '#334155'}`,
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              {fieldErrors.loginDocNumber && (
                <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.3rem', display: 'block' }}>
                  {fieldErrors.loginDocNumber}
                </span>
              )}
            </div>

            {/* Correo Electrónico */}
            <div>
              <label
                htmlFor="loginEmail"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
              >
                Correo Electrónico <span style={{ color: '#f59e0b' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '0.875rem', color: fieldErrors.loginEmail ? '#f87171' : '#64748b' }}>
                  <Mail size={18} />
                </div>
                <input
                  id="loginEmail"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (fieldErrors.loginEmail) setFieldErrors((prev) => ({ ...prev, loginEmail: '' }));
                  }}
                  placeholder="correo@ejemplo.com"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem 0.7rem 2.6rem',
                    backgroundColor: '#0f172a',
                    border: `1px solid ${fieldErrors.loginEmail ? '#ef4444' : '#334155'}`,
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              {fieldErrors.loginEmail && (
                <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.3rem', display: 'block' }}>
                  {fieldErrors.loginEmail}
                </span>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <label
                htmlFor="loginPassword"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
              >
                Contraseña <span style={{ color: '#f59e0b' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '0.875rem', color: fieldErrors.loginPassword ? '#f87171' : '#64748b' }}>
                  <Lock size={18} />
                </div>
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (fieldErrors.loginPassword) setFieldErrors((prev) => ({ ...prev, loginPassword: '' }));
                  }}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.7rem 2.6rem 0.7rem 2.6rem',
                    backgroundColor: '#0f172a',
                    border: `1px solid ${fieldErrors.loginPassword ? '#ef4444' : '#334155'}`,
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.loginPassword && (
                <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.3rem', display: 'block' }}>
                  {fieldErrors.loginPassword}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.85rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#f59e0b',
                color: '#0f172a',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                opacity: isSubmitting ? 0.8 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid #0f172a',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODO 2: FORMULARIO DE REGISTRO */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Rol en la Aplicación */}
            <div>
              <label
                htmlFor="regRole"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
              >
                Rol en la aplicación <span style={{ color: '#f59e0b' }}>*</span>
              </label>
              <select
                id="regRole"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as UserRole)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.875rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  outline: 'none',
                  fontWeight: '600',
                }}
              >
                <option value="CONDUCTOR">Conductor</option>
                <option value="NIVEL_2">Gestor de flota — Nivel 2</option>
                <option value="NIVEL_1">Administrador — Nivel 1</option>
              </select>
            </div>

            {/* Tipo y Número de Documento */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ width: '100px' }}>
                <label
                  htmlFor="regDocType"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
                >
                  Tipo
                </label>
                <select
                  id="regDocType"
                  value={regDocType}
                  onChange={(e) => setRegDocType(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.5rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                >
                  <option value="CC">C.C.</option>
                  <option value="NIT">N.I.T.</option>
                  <option value="CE">C.E.</option>
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label
                  htmlFor="regDocNumber"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
                >
                  Documento / Identificación <span style={{ color: '#f59e0b' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '0.875rem', color: fieldErrors.regDocNumber ? '#f87171' : '#64748b' }}>
                    <FileText size={18} />
                  </div>
                  <input
                    id="regDocNumber"
                    type="text"
                    value={regDocNumber}
                    onChange={(e) => {
                      setRegDocNumber(e.target.value);
                      if (fieldErrors.regDocNumber) setFieldErrors((prev) => ({ ...prev, regDocNumber: '' }));
                    }}
                    placeholder="Ej: 1098765432"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '0.7rem 1rem 0.7rem 2.6rem',
                      backgroundColor: '#0f172a',
                      border: `1px solid ${fieldErrors.regDocNumber ? '#ef4444' : '#334155'}`,
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
                {fieldErrors.regDocNumber && (
                  <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.3rem', display: 'block' }}>
                    {fieldErrors.regDocNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Nombres y Apellidos */}
            <div>
              <label
                htmlFor="regName"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
              >
                Nombres y Apellidos / Razón Social <span style={{ color: '#f59e0b' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '0.875rem', color: fieldErrors.regName ? '#f87171' : '#64748b' }}>
                  <User size={18} />
                </div>
                <input
                  id="regName"
                  type="text"
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    if (fieldErrors.regName) setFieldErrors((prev) => ({ ...prev, regName: '' }));
                  }}
                  placeholder="Ej: Carlos Pérez Martínez"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem 0.7rem 2.6rem',
                    backgroundColor: '#0f172a',
                    border: `1px solid ${fieldErrors.regName ? '#ef4444' : '#334155'}`,
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              {fieldErrors.regName && (
                <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.3rem', display: 'block' }}>
                  {fieldErrors.regName}
                </span>
              )}
            </div>

            {/* Teléfono / Celular */}
            <div>
              <label
                htmlFor="regPhone"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
              >
                Teléfono / Celular
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '0.875rem', color: '#64748b' }}>
                  <Phone size={18} />
                </div>
                <input
                  id="regPhone"
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="Ej: 3001234567"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem 0.7rem 2.6rem',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div>
              <label
                htmlFor="regEmail"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
              >
                Correo Electrónico <span style={{ color: '#f59e0b' }}>*</span>
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: '0.875rem', color: fieldErrors.regEmail ? '#f87171' : '#64748b' }}>
                  <Mail size={18} />
                </div>
                <input
                  id="regEmail"
                  type="email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (fieldErrors.regEmail) setFieldErrors((prev) => ({ ...prev, regEmail: '' }));
                  }}
                  placeholder="correo@ejemplo.com"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.7rem 1rem 0.7rem 2.6rem',
                    backgroundColor: '#0f172a',
                    border: `1px solid ${fieldErrors.regEmail ? '#ef4444' : '#334155'}`,
                    borderRadius: '10px',
                    color: '#f8fafc',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              {fieldErrors.regEmail && (
                <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.3rem', display: 'block' }}>
                  {fieldErrors.regEmail}
                </span>
              )}
            </div>

            {/* Contraseña y Confirmación */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="regPassword"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
                >
                  Contraseña <span style={{ color: '#f59e0b' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="regPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (fieldErrors.regPassword) setFieldErrors((prev) => ({ ...prev, regPassword: '' }));
                    }}
                    placeholder="Mín 6 caract."
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '0.7rem 2rem 0.7rem 0.875rem',
                      backgroundColor: '#0f172a',
                      border: `1px solid ${fieldErrors.regPassword ? '#ef4444' : '#334155'}`,
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.5rem', background: 'none', border: 'none', color: '#64748b' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.regPassword && (
                  <span style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.2rem', display: 'block' }}>
                    {fieldErrors.regPassword}
                  </span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label
                  htmlFor="regConfirmPassword"
                  style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.4rem' }}
                >
                  Confirmar <span style={{ color: '#f59e0b' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="regConfirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (fieldErrors.regConfirmPassword) setFieldErrors((prev) => ({ ...prev, regConfirmPassword: '' }));
                    }}
                    placeholder="Repite clave"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '0.7rem 2rem 0.7rem 0.875rem',
                      backgroundColor: '#0f172a',
                      border: `1px solid ${fieldErrors.regConfirmPassword ? '#ef4444' : '#334155'}`,
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '0.5rem', background: 'none', border: 'none', color: '#64748b' }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.regConfirmPassword && (
                  <span style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '0.2rem', display: 'block' }}>
                    {fieldErrors.regConfirmPassword}
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.85rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#f59e0b',
                color: '#0f172a',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                opacity: isSubmitting ? 0.8 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid #0f172a',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Creando cuenta de usuario...</span>
                </>
              ) : (
                <>
                  <span>Crear Cuenta de Tercero</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Guía informativa de Niveles y Roles */}
        <div
          style={{
            borderTop: '1px solid #334155',
            paddingTop: '1rem',
            fontSize: '0.75rem',
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontWeight: '600' }}>
            <Shield size={14} style={{ color: '#f59e0b' }} />
            <span>Información sobre permisos del sistema:</span>
          </div>
          <p style={{ margin: 0, lineHeight: '1.4' }}>
            Al registrarte, tu cuenta quedará vinculada con el rol básico de conductor u operativo. Si cuentas con un contrato de servicio (Nivel 1 o Nivel 2), tus permisos avanzados se habilitarán automáticamente.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
