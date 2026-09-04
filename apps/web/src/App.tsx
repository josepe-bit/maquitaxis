import React, { useState, useEffect } from 'react';
import {
  Car,
  Activity,
  Radio,
  Clock,
  Users,
  DollarSign,
  Navigation,
  Map,
  Building2,
  Tag,
  Wrench,
  LogOut,
  UserCheck,
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  X,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { TaxiMap } from './components/TaxiMap';
import { realtimeService } from './services/realtime';
import { Vehiculo, GPSPosition } from '@maquitaxis/shared';
import { VehiculosManagementPage } from './pages/VehiculosManagementPage';
import { TercerosManagementPage } from './pages/TercerosManagementPage';
import { ProduccionAdminPage } from './pages/ProduccionAdminPage';
import { HistoryRoutesPage } from './pages/HistoryRoutesPage';
import { CarrerasAdminPage } from './pages/CarrerasAdminPage';
import { ServiciosManagementPage } from './pages/ServiciosManagementPage';
import { MarcasManagementPage } from './pages/MarcasManagementPage';
import { EventosManagementPage } from './pages/EventosManagementPage';
import { ControlManagementPage } from './pages/ControlManagementPage';
import { MantenimientoVehiculoPage } from './pages/MantenimientoVehiculoPage';
import { SSocialManagementPage } from './pages/SSocialManagementPage';
import { LiquidacionConductorPage } from './pages/LiquidacionConductorPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthView } from './pages/AuthView';
import { ProtectedRoute } from './components/ProtectedRoute';

type ActiveWebTab =
  | 'MAP_REALTIME'
  | 'SERVICIOS_APP'
  | 'CARRERAS'
  | 'VEHICULOS'
  | 'MARCAS'
  | 'EVENTOS'
  | 'CONTROL'
  | 'MANTENIMIENTO'
  | 'SSOCIAL'
  | 'LIQUIDACION'
  | 'TERCEROS'
  | 'PRODUCCION'
  | 'HISTORY_ROUTES';

interface NavItem {
  key: ActiveWebTab;
  label: string;
  icon: React.ReactNode;
}

interface NavCategory {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'operacion',
    title: 'Operación',
    items: [
      { key: 'MAP_REALTIME', label: 'Mapa Tiempo Real', icon: <Map size={16} /> },
      { key: 'CARRERAS', label: 'Despacho Carreras', icon: <Navigation size={16} /> },
      { key: 'HISTORY_ROUTES', label: 'Histórico Rutas', icon: <Activity size={16} /> },
    ],
  },
  {
    id: 'flota',
    title: 'Gestión Flota',
    items: [
      { key: 'VEHICULOS', label: 'Gestión Taxis', icon: <Car size={16} /> },
      { key: 'MANTENIMIENTO', label: 'Mantenimiento Vehículo', icon: <Wrench size={16} /> },
      { key: 'CONTROL', label: 'Control Eventos', icon: <ShieldCheck size={16} /> },
      { key: 'EVENTOS', label: 'Catálogo Eventos', icon: <Calendar size={16} /> },
      { key: 'MARCAS', label: 'Marcas Vehículos', icon: <Tag size={16} /> },
    ],
  },
  {
    id: 'finanzas',
    title: 'Operación & Cuentas',
    items: [
      { key: 'PRODUCCION', label: 'Producción Diaria', icon: <DollarSign size={16} /> },
      { key: 'LIQUIDACION', label: 'Liquidación Conductor', icon: <DollarSign size={16} /> },
      { key: 'SSOCIAL', label: 'Seguridad Social', icon: <ShieldCheck size={16} /> },
    ],
  },
  {
    id: 'personas',
    title: 'Personas & Servicios',
    items: [
      { key: 'TERCEROS', label: 'Terceros / Conductores', icon: <Users size={16} /> },
      { key: 'SERVICIOS_APP', label: 'Servicios Suscripción', icon: <Building2 size={16} /> },
    ],
  },
];

const MainContentLayout: React.FC = () => {
  const { user, tercero, rol, permisos, loading, logout, hasPermission, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveWebTab>('MAP_REALTIME');
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string | undefined>(undefined);
  const [lastPositionEvent, setLastPositionEvent] = useState<string>('Esperando señal...');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Expandir por defecto únicamente la categoría que contiene la pestaña activa al abrir el menú
  useEffect(() => {
    if (mobileMenuOpen) {
      const currentCat = NAV_CATEGORIES.find((cat) =>
        cat.items.some((item) => item.key === activeTab)
      );
      if (currentCat) {
        setExpandedCategories({ [currentCat.id]: true });
      } else {
        setExpandedCategories({});
      }
    }
  }, [mobileMenuOpen, activeTab]);

  // Listener para cerrar el menú hamburguesa con la tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };


  // Modal Cambiar Contraseña
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'La nueva contraseña debe tener mínimo 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Las contraseñas no coinciden.' });
      return;
    }

    setPasswordLoading(true);
    const res = await changePassword(newPassword);
    setPasswordLoading(false);

    if (res.success) {
      setPasswordFeedback({ type: 'success', message: res.message || 'Contraseña actualizada con éxito.' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordFeedback(null);
      }, 1800);
    } else {
      setPasswordFeedback({ type: 'error', message: res.message || 'No se pudo cambiar la contraseña.' });
    }
  };

  // Ajustar la pestaña activa automáticamente si el rol restringido no tiene acceso a la pestaña por defecto
  useEffect(() => {
    if (permisos.allowedTabs.length > 0 && !hasPermission(activeTab)) {
      setActiveTab(permisos.allowedTabs[0] as ActiveWebTab);
    }
  }, [permisos, activeTab]);

  useEffect(() => {
    if (!user) return;

    // 1. Cargar lista de vehículos inicial
    realtimeService.fetchVehiculos().then((list) => {
      setVehiculos(list);
      if (list.length > 0) {
        setSelectedVehiculoId(list[0].id);
      }
    });

    // 2. Suscribirse a actualizaciones Realtime vía WebSockets
    const unsubscribe = realtimeService.subscribeToLivePositions(
      (newPos: GPSPosition) => {
        setLastPositionEvent(`Punto GPS recibido a las ${new Date(newPos.timestamp).toLocaleTimeString()}`);
        setVehiculos((prevList) =>
          prevList.map((v) =>
            v.id === newPos.vehiculoId
              ? {
                  ...v,
                  lastKnownLat: newPos.latitude,
                  lastKnownLng: newPos.longitude,
                  lastLocationAt: newPos.timestamp,
                  status: 'en_servicio',
                }
              : v
          )
        );
      },
      (updatedVehiculo: Vehiculo) => {
        setVehiculos((prevList) =>
          prevList.map((v) => (v.id === updatedVehiculo.id ? { ...v, ...updatedVehiculo } : v))
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

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
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            border: '3px solid #334155',
            borderTopColor: '#f59e0b',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: 0 }}>Cargando MaquiTaxis...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const totalTaxis = vehiculos.length;
  const inServiceTaxis = vehiculos.filter((v) => v.status === 'en_servicio').length;
  const availableTaxis = vehiculos.filter((v) => v.status === 'disponible').length;

  const visibleCategories = NAV_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => hasPermission(item.key)),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-dark)',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          height: '60px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          background: 'var(--bg-card)',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          {/* Botón Menú Hamburguesa */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú de navegación"
            title="Menú de Navegación"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: mobileMenuOpen ? 'var(--primary)' : 'rgba(51, 65, 85, 0.4)',
              color: mobileMenuOpen ? 'var(--bg-dark)' : 'var(--text-primary)',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Menú</span>
          </button>

          {/* Logo actual */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--primary)',
              fontWeight: '800',
              fontSize: '1.25rem',
            }}
          >
            <Car size={26} />
            <span>MaquiTaxis</span>
          </div>
        </div>

        {/* Panel de usuario y sesión */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <Clock size={16} color="var(--primary)" />
            <span>{lastPositionEvent}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              paddingLeft: '0.75rem',
              borderLeft: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {tercero?.name || user.email}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: rol === 'NIVEL_1' ? '#38bdf8' : rol === 'NIVEL_2' ? '#10b981' : '#f59e0b',
                    backgroundColor: 'rgba(51, 65, 85, 0.6)',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                  }}
                >
                  {rol === 'NIVEL_1'
                    ? 'NIVEL 1 - ADMIN'
                    : rol === 'NIVEL_2'
                    ? 'NIVEL 2 - GESTOR FLOTA'
                    : 'CONDUCTOR'}
                </span>
                {tercero?.doc_number && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    (Doc: {tercero.doc_number})
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={() => {
                  setShowPasswordModal(true);
                  setPasswordFeedback(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                title="Cambiar Contraseña"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  transition: 'all 0.2s',
                }}
              >
                <KeyRound size={15} />
                <span>Cambiar Clave</span>
              </button>

              <button
                onClick={logout}
                title="Cerrar Sesión"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menú Hamburguesa Slide-Over & Acordeón */}
      {mobileMenuOpen && (
        <div
          className="drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {mobileMenuOpen && (
        <div className="drawer-content">
          {/* Header del Drawer */}
          <div
            style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(30, 41, 59, 0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: '800', fontSize: '1.15rem' }}>
              <Car size={22} />
              <span>Navegación</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Cerrar menú"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body del Drawer - Acordeón por Categorías */}
          <div style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visibleCategories.map((cat) => {
              const isExpanded = !!expandedCategories[cat.id];
              const hasActiveTab = cat.items.some((i) => i.key === activeTab);

              return (
                <div
                  key={cat.id}
                  style={{
                    borderRadius: '10px',
                    border: hasActiveTab ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Encabezado Categoría (Acordeón Header) */}
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      backgroundColor: isExpanded ? 'rgba(51, 65, 85, 0.4)' : 'transparent',
                      border: 'none',
                      color: hasActiveTab ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: '700',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {cat.title}
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'rgba(51, 65, 85, 0.6)',
                          padding: '0.1rem 0.4rem',
                          borderRadius: '9999px',
                        }}
                      >
                        {cat.items.length}
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>

                  {/* Opciones desplegadas de la Categoría */}
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.4rem 0.5rem 0.5rem 0.5rem', borderTop: '1px solid rgba(51, 65, 85, 0.3)' }}>
                      {cat.items.map((item) => {
                        const isActive = activeTab === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => {
                              setActiveTab(item.key);
                              setMobileMenuOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              width: '100%',
                              minHeight: '44px',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              border: isActive ? '1px solid var(--primary)' : 'none',
                              backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                              color: isActive ? 'var(--bg-dark)' : 'var(--text-secondary)',
                              fontWeight: isActive ? '800' : '500',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              textAlign: 'left',
                              transition: 'all 0.15s ease-in-out',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                            <span style={{ flex: 1 }}>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Perfil del Usuario & Acciones en Drawer */}
          <div
            style={{
              padding: '1.25rem',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: 'rgba(30, 41, 59, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {tercero?.name || user.email}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    color: rol === 'NIVEL_1' ? '#38bdf8' : rol === 'NIVEL_2' ? '#10b981' : '#f59e0b',
                    backgroundColor: 'rgba(51, 65, 85, 0.6)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                  }}
                >
                  {rol === 'NIVEL_1' ? 'NIVEL 1 - ADMIN' : rol === 'NIVEL_2' ? 'NIVEL 2 - GESTOR FLOTA' : 'CONDUCTOR'}
                </span>
                {tercero?.doc_number && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    (Doc: {tercero.doc_number})
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowPasswordModal(true);
                  setPasswordFeedback(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                }}
              >
                <KeyRound size={15} />
                <span>Cambiar Clave</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                title="Cerrar Sesión"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal Cambiar Contraseña */}
      {showPasswordModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Cambiar Contraseña de Usuario
                </h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} style={{ padding: '1.5rem' }}>
              {passwordFeedback && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor:
                      passwordFeedback.type === 'success'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${passwordFeedback.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: passwordFeedback.type === 'success' ? '#34d399' : '#f87171',
                    fontSize: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {passwordFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Confirmar Nueva Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Repita la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary)',
                    border: 'none',
                    color: 'var(--bg-dark)',
                    fontWeight: '700',
                    cursor: passwordLoading ? 'wait' : 'pointer',
                  }}
                >
                  {passwordLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vista Principal envuelta en ProtectedRoute */}
      <ProtectedRoute tabKey={activeTab} onNavigateToAllowed={(tab) => setActiveTab(tab as ActiveWebTab)}>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeTab === 'MAP_REALTIME' && (
            <div className="app-container" style={{ width: '100%', height: '100%' }}>
              {/* Sidebar de Control */}
              <aside className="sidebar">
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.75rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Monitoreo en Tiempo Real
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div
                      style={{
                        background: 'var(--bg-dark)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>En Servicio</span>
                        <span className="badge badge-service">{inServiceTaxis} Activos</span>
                      </div>
                      <p style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>{inServiceTaxis}</p>
                    </div>

                    <div
                      style={{
                        background: 'var(--bg-dark)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Disponibles / Total</span>
                        <Activity size={16} color="var(--accent-blue)" />
                      </div>
                      <p style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>
                        {availableTaxis} / {totalTaxis}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de Taxis Monitoreados */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <h3
                    style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.75rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Taxis Monitoreados
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {vehiculos.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVehiculoId(v.id)}
                        style={{
                          background: selectedVehiculoId === v.id ? 'var(--bg-card-hover)' : 'var(--bg-dark)',
                          padding: '1rem',
                          borderRadius: '8px',
                          border:
                            selectedVehiculoId === v.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <span style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--primary)' }}>
                            Taxi {v.plate}
                          </span>
                          <span
                            className={`badge ${
                              v.status === 'en_servicio' ? 'badge-service' : 'badge-available'
                            }`}
                          >
                            {v.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          Conductor: {v.driver ? v.driver.name : 'No asignado'}
                        </p>

                        {v.lastKnownLat && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '0.25rem' }}>
                            Posición: {v.lastKnownLat.toFixed(4)}, {v.lastKnownLng?.toFixed(4)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Área del Mapa Principal con Leaflet */}
              <main className="main-content">
                <div style={{ flex: 1, position: 'relative' }}>
                  <TaxiMap vehiculos={vehiculos} selectedVehiculoId={selectedVehiculoId} />
                </div>
              </main>
            </div>
          )}

          {activeTab === 'SERVICIOS_APP' && <ServiciosManagementPage />}
          {activeTab === 'CARRERAS' && <CarrerasAdminPage />}
          {activeTab === 'VEHICULOS' && <VehiculosManagementPage />}
          {activeTab === 'MARCAS' && <MarcasManagementPage />}
          {activeTab === 'EVENTOS' && <EventosManagementPage />}
          {activeTab === 'CONTROL' && <ControlManagementPage />}
          {activeTab === 'MANTENIMIENTO' && <MantenimientoVehiculoPage />}
          {activeTab === 'SSOCIAL' && <SSocialManagementPage />}
          {activeTab === 'LIQUIDACION' && <LiquidacionConductorPage />}
          {activeTab === 'TERCEROS' && <TercerosManagementPage />}
          {activeTab === 'PRODUCCION' && <ProduccionAdminPage />}
          {activeTab === 'HISTORY_ROUTES' && <HistoryRoutesPage />}

        </div>
      </ProtectedRoute>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContentLayout />
    </AuthProvider>
  );
};
