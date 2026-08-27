import React, { useState } from 'react';
import { Car, Mail, Lock, FileText, Eye, EyeOff, AlertCircle, Shield, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login, error: globalError, clearError } = useAuth();

  const [docNumber, setDocNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ docNumber?: string; email?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const errors: { docNumber?: string; email?: string; password?: string } = {};

    if (!docNumber.trim()) {
      errors.docNumber = 'El número de identificación es obligatorio.';
    } else if (!/^[0-9A-Za-z-]+$/.test(docNumber.trim())) {
      errors.docNumber = 'Documento de identificación inválido.';
    }

    if (!email.trim()) {
      errors.email = 'El correo electrónico o usuario es obligatorio.';
    } else if (!email.includes('@')) {
      errors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(docNumber.trim(), email.trim(), password);

      if (result.success) {
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setFormError(result.message || 'No fue posible iniciar sesión.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = formError || globalError;

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
          maxWidth: '460px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.1)',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Encabezado e Identidad visual */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
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
            <Car size={36} />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
            Maqui<span style={{ color: '#f59e0b' }}>Taxis</span>
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
            Acceso a la Plataforma de Gestión de Flotas y Taxis
          </p>
        </div>

        {/* Banner de Error */}
        {activeError && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              padding: '0.875rem 1rem',
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
              <strong style={{ display: 'block', fontWeight: '700', marginBottom: '2px' }}>Error de Autenticación</strong>
              {activeError}
            </div>
          </div>
        )}

        {/* Formulario de Inicio de Sesión */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Campo 1: Identificación / Documento del Tercero */}
          <div>
            <label
              htmlFor="docNumber"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.5rem' }}
            >
              Documento de Identificación del Tercero <span style={{ color: '#f59e0b' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '1rem',
                  color: fieldErrors.docNumber ? '#f87171' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <FileText size={18} />
              </div>
              <input
                id="docNumber"
                type="text"
                value={docNumber}
                onChange={(e) => {
                  setDocNumber(e.target.value);
                  if (fieldErrors.docNumber) setFieldErrors((prev) => ({ ...prev, docNumber: undefined }));
                }}
                placeholder="Ej: 1098765432"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  backgroundColor: '#0f172a',
                  border: `1px solid ${fieldErrors.docNumber ? '#ef4444' : '#334155'}`,
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            {fieldErrors.docNumber && (
              <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.35rem', display: 'block' }}>
                {fieldErrors.docNumber}
              </span>
            )}
          </div>

          {/* Campo 2: Correo Electrónico o Usuario */}
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.5rem' }}
            >
              Correo Electrónico <span style={{ color: '#f59e0b' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '1rem',
                  color: fieldErrors.email ? '#f87171' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Mail size={18} />
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="correo@ejemplo.com"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  backgroundColor: '#0f172a',
                  border: `1px solid ${fieldErrors.email ? '#ef4444' : '#334155'}`,
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
            {fieldErrors.email && (
              <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.35rem', display: 'block' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Campo 3: Contraseña */}
          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#cbd5e1', marginBottom: '0.5rem' }}
            >
              Contraseña <span style={{ color: '#f59e0b' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '1rem',
                  color: fieldErrors.password ? '#f87171' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Lock size={18} />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.75rem 0.75rem 2.75rem',
                  backgroundColor: '#0f172a',
                  border: `1px solid ${fieldErrors.password ? '#ef4444' : '#334155'}`,
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
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
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.35rem', display: 'block' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.875rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#f59e0b',
              color: '#0f172a',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              opacity: isSubmitting ? 0.8 : 1,
              transition: 'all 0.2s ease',
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
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Guía informativa de Niveles y Roles */}
        <div
          style={{
            borderTop: '1px solid #334155',
            paddingTop: '1.25rem',
            fontSize: '0.75rem',
            color: '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#cbd5e1', fontWeight: '600' }}>
            <Shield size={14} style={{ color: '#f59e0b' }} />
            <span>Niveles de Acceso del Sistema:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>
              <strong style={{ color: '#38bdf8' }}>Nivel 1 (SuperAdmin):</strong> Acceso total a todos los módulos.
            </li>
            <li>
              <strong style={{ color: '#10b981' }}>Nivel 2 (Gestor Flota):</strong> Administración exclusiva de Vehículos.
            </li>
            <li>
              <strong style={{ color: '#f59e0b' }}>Conductor:</strong> Operación básica de turnos y mapa en tiempo real.
            </li>
          </ul>
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
