import React, { ReactNode } from 'react';
import { ShieldAlert, Car, LogOut, ArrowRight, Lock } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { AuthView } from '../pages/AuthView';

interface ProtectedRouteProps {
  children: ReactNode;
  tabKey?: string;
  onNavigateToAllowed?: (allowedTab: string) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, tabKey, onNavigateToAllowed }) => {
  const { user, rol, permisos, loading, logout, hasPermission, tercero } = useAuth();

  // 1. Pantalla de carga mientras se verifica sesión y roles
  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          gap: '1rem',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #334155',
            borderTopColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
          Verificando sesión y nivel de acceso...
        </p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 2. Si no hay usuario autenticado, renderizar la vista de autenticación (Login/Registro)
  if (!user) {
    return <AuthView />;
  }

  // 3. Verificar si se especificó una pestaña/módulo y si el usuario tiene permiso
  if (tabKey && !hasPermission(tabKey)) {
    const allowedTab = permisos.allowedTabs[0] || 'MAP_REALTIME';

    return (
      <div
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          padding: '2rem',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={32} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              Acceso Restringido por Nivel de Servicio
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
              Tu usuario <strong style={{ color: '#f8fafc' }}>{tercero?.name || user.email}</strong> tiene asignado el rol{' '}
              <span
                style={{
                  display: 'inline-block',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: '#f59e0b',
                  fontWeight: '700',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                }}
              >
                {rol === 'NIVEL_1'
                  ? 'Nivel 1 (SuperAdmin)'
                  : rol === 'NIVEL_2'
                  ? 'Nivel 2 (Gestor de Flota)'
                  : 'Conductor Operativo'}
              </span>{' '}
              y no cuenta con permisos para acceder al módulo <code style={{ color: '#38bdf8' }}>{tabKey}</code>.
            </p>
          </div>

          <div
            style={{
              width: '100%',
              backgroundColor: '#0f172a',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'left',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <span style={{ fontWeight: '700', color: '#94a3b8' }}>Permisos del rol actual:</span>
            {rol === 'NIVEL_2' && (
              <span>• Este nivel solo permite la administración y registro de Vehículos.</span>
            )}
            {rol === 'CONDUCTOR' && (
              <span>• Este rol solo permite operaciones en mapa en tiempo real.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
            {onNavigateToAllowed && (
              <button
                onClick={() => onNavigateToAllowed(allowedTab)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f59e0b',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>Ir a Módulo Permitido</span>
                <ArrowRight size={16} />
              </button>
            )}

            <button
              onClick={logout}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
              }}
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Si todo es correcto, renderizar vista protegida
  return <>{children}</>;
};
