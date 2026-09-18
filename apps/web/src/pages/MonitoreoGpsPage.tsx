import React, { useEffect, useState, useMemo } from 'react';
import {
  getActiveVehiclesTracking,
  subscribeToTrackingRealtime,
  type ActiveVehicleTracking,
} from '../services/trackingService';
import GpsMap from '../components/GpsMap';
import { Search, RefreshCw, Radio, Car, ShieldAlert, CheckCircle2, Phone, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { webGpsCommandService } from '../services/gpsCommandService';
import type { GpsCommand, GpsCommandType } from '@maquitaxis/shared';

/** Umbral técnico de obsolescencia GPS (3 minutos) */
const STALE_THRESHOLD_MS = 3 * 60 * 1000;

/** Helper nativo para formatear tiempo transcurrido */
function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return 'sin fecha';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'fecha inválida';

  const now = Date.now();
  let diffMs = now - date.getTime();

  // Caso de inconsistencia de reloj (timestamp futuro): no mostrar tiempos negativos
  if (diffMs < 0) {
    diffMs = 0;
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return `hace ${diffSeconds} s`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `hace ${diffHours} h`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

/** Helper para determinar el estado de actualidad GPS */
function getGpsStatus(lat: number | null, lng: number | null, lastLocationAt: string | null) {
  const hasCoords = lat != null && lng != null;
  if (!hasCoords) {
    return { state: 'SIN_COORDENADAS' as const, isStale: false, timeAgo: '' };
  }
  if (!lastLocationAt) {
    return { state: 'OBSOLETO' as const, isStale: true, timeAgo: 'sin fecha' };
  }

  const date = new Date(lastLocationAt);
  if (isNaN(date.getTime())) {
    return { state: 'OBSOLETO' as const, isStale: true, timeAgo: 'fecha inválida' };
  }

  const diffMs = Date.now() - date.getTime();
  const isStale = diffMs > STALE_THRESHOLD_MS;

  return {
    state: isStale ? ('OBSOLETO' as const) : ('EN_VIVO' as const),
    isStale,
    timeAgo: formatTimeAgo(lastLocationAt),
  };
}

export const MonitoreoGpsPage: React.FC = () => {
  const { rol, servicio, tercero } = useAuth();
  const [vehicles, setVehicles] = useState<ActiveVehicleTracking[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Estado para gestión de comandos GPS en el vehículo seleccionado
  const [activeCommand, setActiveCommand] = useState<GpsCommand | null>(null);
  const [isCommandSubmitting, setIsCommandSubmitting] = useState<boolean>(false);
  const [commandActionError, setCommandActionError] = useState<string | null>(null);
  const [commandTimerWarning, setCommandTimerWarning] = useState<boolean>(false);
  const [showStopConfirmModal, setShowStopConfirmModal] = useState<boolean>(false);

  // Cargar lista de vehículos (Aislamiento Multiempresa para Nivel 2)
  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const targetServicioId = rol === 'NIVEL_2' ? servicio?.id : null;
      const data = await getActiveVehiclesTracking(targetServicioId);
      setVehicles(data);
    } catch (err: any) {
      console.error('[MonitoreoGpsPage] Error al cargar vehículos:', err);
      setErrorMessage(err.message || 'No se pudieron cargar los datos de rastreo GPS');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Suscribirse a Supabase Realtime para vehiculos y tracking_sessions
    const unsubscribe = subscribeToTrackingRealtime(() => {
      setIsRealtimeActive(true);
      loadData();
    });

    setIsRealtimeActive(true);

    return () => {
      unsubscribe();
      setIsRealtimeActive(false);
    };
  }, [rol, servicio?.id]);

  // Obtener comando activo y suscribir a Realtime cuando cambia el vehículo seleccionado
  useEffect(() => {
    if (!selectedVehicleId) {
      setActiveCommand(null);
      setCommandActionError(null);
      setCommandTimerWarning(false);
      setShowStopConfirmModal(false);
      return;
    }

    let isMounted = true;
    setCommandActionError(null);
    setCommandTimerWarning(false);
    setShowStopConfirmModal(false);

    // 1. Consultar si existe un comando 'pending' o 'executing' previo
    webGpsCommandService
      .getActiveCommandForVehicle(selectedVehicleId)
      .then((cmd) => {
        if (isMounted) {
          setActiveCommand(cmd);
        }
      })
      .catch((err) => {
        console.error('[MonitoreoGpsPage] Error consultando comando activo:', err);
      });

    // 2. Suscribir en tiempo real a la tabla gps_commands para este vehículo
    const unsubscribeCmd = webGpsCommandService.subscribeToVehicleGpsCommands(
      selectedVehicleId,
      (cmd) => {
        if (!isMounted) return;
        setActiveCommand(cmd);

        if (cmd.status === 'completed') {
          loadData();
          setTimeout(() => {
            if (isMounted) {
              setActiveCommand((curr) => (curr?.id === cmd.id ? null : curr));
            }
          }, 5000);
        } else if (cmd.status === 'failed') {
          loadData();
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeCmd();
    };
  }, [selectedVehicleId]);

  // Temporizador de advertencia si un comando permanece en 'pending' por más de 15 segundos
  useEffect(() => {
    if (!activeCommand || activeCommand.status !== 'pending') {
      setCommandTimerWarning(false);
      return;
    }

    const timer = setTimeout(() => {
      setCommandTimerWarning(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [activeCommand?.id, activeCommand?.status]);

  // Filtrado de vehículos
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.driverName && v.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.model && v.model.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activos' && (v.status === 'disponible' || v.status === 'en_servicio')) ||
        v.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, statusFilter]);

  // Contadores de estado
  const stats = useMemo(() => {
    return {
      total: vehicles.length,
      disponibles: vehicles.filter((v) => v.status === 'disponible').length,
      enServicio: vehicles.filter((v) => v.status === 'en_servicio').length,
      sinConexion: vehicles.filter((v) => v.status === 'sin_conexion' || v.status === 'fuera_de_servicio').length,
      conCoordenadas: vehicles.filter((v) => v.lastKnownLat != null && v.lastKnownLng != null).length,
    };
  }, [vehicles]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find((v) => v.vehiculoId === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  // Emisión controlada de comandos de control remoto GPS
  const handleSendGpsCommand = async (commandType: GpsCommandType) => {
    if (!selectedVehicle) return;

    // A. Validar requested_by (tercero?.id)
    if (!tercero?.id) {
      setCommandActionError('No se pudo identificar la cuenta del usuario emisor.');
      return;
    }

    // B. Validar conductor asignado (driverId)
    if (!selectedVehicle.driverId) {
      setCommandActionError('Este vehículo no tiene un conductor asignado.');
      return;
    }

    try {
      setIsCommandSubmitting(true);
      setCommandActionError(null);
      setCommandTimerWarning(false);

      const createdCmd = await webGpsCommandService.sendGpsCommand(
        selectedVehicle.vehiculoId,
        commandType,
        selectedVehicle.driverId,
        tercero.id
      );

      setActiveCommand(createdCmd);
    } catch (err: any) {
      console.error('[MonitoreoGpsPage] Error enviando comando GPS:', err);
      setCommandActionError(err.message || 'Error al enviar orden de control GPS.');
    } finally {
      setIsCommandSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', height: '100%', minHeight: 0, overflow: 'hidden', backgroundColor: '#0f172a' }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.65rem 1.25rem',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Car size={24} style={{ color: '#f59e0b' }} />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Monitoreo GPS en Tiempo Real
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
              Ubicación activa de la flota de MaquiTaxis
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Indicador Realtime */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: isRealtimeActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isRealtimeActive ? '#10b981' : '#ef4444',
            }}
          >
            <Radio size={14} className={isRealtimeActive ? 'animate-pulse' : ''} />
            <span>{isRealtimeActive ? 'Realtime Conectado' : 'Sin Realtime'}</span>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.875rem',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Actualizar</span>
          </button>
        </div>
      </header>

      {/* Main Body (Panel lateral + Mapa) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Panel Lateral Listado */}
        <aside
          style={{
            width: '360px',
            flexShrink: 0,
            backgroundColor: '#1e293b',
            borderRight: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Filtros y Buscador */}
          <div style={{ padding: '1rem', borderBottom: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Buscador */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Buscar por placa, conductor o modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.5rem 0.5rem 2.25rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.375rem',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Pestañas de Estado */}
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#0f172a', padding: '0.25rem', borderRadius: '0.375rem' }}>
              {[
                { id: 'todos', label: `Todos (${stats.total})` },
                { id: 'disponible', label: `Disponibles (${stats.disponibles})` },
                { id: 'en_servicio', label: `En servicio (${stats.enServicio})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    flex: 1,
                    padding: '0.375rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: statusFilter === tab.id ? '#334155' : 'transparent',
                    color: statusFilter === tab.id ? '#f59e0b' : '#94a3b8',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estado de Error */}
          {errorMessage && (
            <div
              style={{
                margin: '1rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '0.375rem',
                color: '#fca5a5',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <ShieldAlert size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Lista de Vehículos */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {isLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                <p>Cargando lista de vehículos...</p>
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                <Car size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                <p style={{ fontWeight: 600 }}>No hay vehículos activos</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  No se encontraron taxis que coincidan con la búsqueda.
                </p>
              </div>
            ) : (
              filteredVehicles.map((v) => {
                const isSelected = v.vehiculoId === selectedVehicleId;
                const gpsStatus = getGpsStatus(v.lastKnownLat, v.lastKnownLng, v.lastLocationAt);

                return (
                  <div
                    key={v.vehiculoId}
                    onClick={() => setSelectedVehicleId(v.vehiculoId)}
                    style={{
                      padding: '0.875rem',
                      marginBottom: '0.5rem',
                      borderRadius: '0.5rem',
                      backgroundColor: isSelected ? '#334155' : '#0f172a',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>
                          🚕 {v.plate}
                        </span>
                        {v.model && (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            ({v.model})
                          </span>
                        )}
                      </div>

                      {/* Badge de estado */}
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor:
                            v.status === 'disponible'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : v.status === 'en_servicio'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(100, 116, 139, 0.2)',
                          color:
                            v.status === 'disponible'
                              ? '#10b981'
                              : v.status === 'en_servicio'
                              ? '#f59e0b'
                              : '#94a3b8',
                        }}
                      >
                        {v.status === 'disponible'
                          ? 'Disponible'
                          : v.status === 'en_servicio'
                          ? 'En Servicio'
                          : 'Sin Conexión'}
                      </span>
                    </div>

                    {/* Información del conductor */}
                    <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      👤 <strong>{v.driverName}</strong>
                    </div>

                    {v.driverPhone && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                        <Phone size={12} />
                        <span>{v.driverPhone}</span>
                      </div>
                    )}

                    {/* Estado de Coordenadas GPS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                      <span
                        style={{
                          color:
                            gpsStatus.state === 'EN_VIVO'
                              ? '#10b981'
                              : gpsStatus.state === 'OBSOLETO'
                              ? '#f59e0b'
                              : '#ef4444',
                          fontWeight: 600,
                        }}
                      >
                        {gpsStatus.state === 'EN_VIVO' && '📍 Ubicación en vivo'}
                        {gpsStatus.state === 'OBSOLETO' && `⚠️ Ubicación desactualizada · ${gpsStatus.timeAgo}`}
                        {gpsStatus.state === 'SIN_COORDENADAS' && '⚠️ Sin coordenadas GPS'}
                      </span>
                      {v.lastLocationAt && (
                        <span style={{ color: '#64748b' }}>
                          {new Date(v.lastLocationAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Sección del Mapa */}
        <main style={{ flex: 1, position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
          <GpsMap
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={(id) => setSelectedVehicleId(id)}
          />

          {/* Floating info box si hay un vehículo seleccionado */}
          {selectedVehicle && (
            <div
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                zIndex: 1000,
                backgroundColor: '#1e293b',
                border: '1px solid #38bdf8',
                borderRadius: '0.5rem',
                padding: '1rem',
                width: '320px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f8fafc' }}>
                  🚕 Taxi {selectedVehicle.plate}
                </span>
                <button
                  onClick={() => setSelectedVehicleId(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <div><strong>Modelo:</strong> {selectedVehicle.model || 'N/A'}</div>
                <div><strong>Color:</strong> {selectedVehicle.color || 'N/A'}</div>
                <div><strong>Conductor:</strong> {selectedVehicle.driverName}</div>
                {selectedVehicle.driverPhone && <div><strong>Teléfono:</strong> {selectedVehicle.driverPhone}</div>}
                <div>
                  <strong>Latitud:</strong> {selectedVehicle.lastKnownLat?.toFixed(6) ?? 'No disp.'}
                </div>
                <div>
                  <strong>Longitud:</strong> {selectedVehicle.lastKnownLng?.toFixed(6) ?? 'No disp.'}
                </div>
                {(() => {
                  const selGpsStatus = getGpsStatus(
                    selectedVehicle.lastKnownLat,
                    selectedVehicle.lastKnownLng,
                    selectedVehicle.lastLocationAt
                  );
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem', fontSize: '0.75rem' }}>
                      <strong style={{ color: '#94a3b8' }}>Estado GPS:</strong>
                      <span
                        style={{
                          color:
                            selGpsStatus.state === 'EN_VIVO'
                              ? '#10b981'
                              : selGpsStatus.state === 'OBSOLETO'
                              ? '#f59e0b'
                              : '#ef4444',
                          fontWeight: 600,
                        }}
                      >
                        {selGpsStatus.state === 'EN_VIVO' && '📍 En vivo'}
                        {selGpsStatus.state === 'OBSOLETO' && `⚠️ Desactualizada (${selGpsStatus.timeAgo})`}
                        {selGpsStatus.state === 'SIN_COORDENADAS' && '⚠️ Sin Coordenadas'}
                      </span>
                    </div>
                  );
                })()}
                {selectedVehicle.lastLocationAt && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Última actualización: {new Date(selectedVehicle.lastLocationAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* SECCIÓN DE CONTROL REMOTO GPS */}
              <div
                style={{
                  marginTop: '0.875rem',
                  paddingTop: '0.875rem',
                  borderTop: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                  <Radio size={14} style={{ color: '#38bdf8' }} />
                  <span>CONTROL REMOTO GPS</span>
                </div>

                {/* Mensaje de Error de Acción si existe */}
                {commandActionError && (
                  <div
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      borderRadius: '0.375rem',
                      color: '#fca5a5',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                    <span>{commandActionError}</span>
                  </div>
                )}

                {/* 1. Bloque de Estado Principal del GPS */}
                {(() => {
                  const isOrderInProgress = activeCommand?.status === 'pending' || activeCommand?.status === 'executing';

                  if (isOrderInProgress) {
                    return (
                      <div
                        style={{
                          padding: '0.625rem',
                          borderRadius: '0.375rem',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid #f59e0b',
                          color: '#fcd34d',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, fontSize: '0.8rem' }}>
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                          <span>🟡 ORDEN EN PROCESO</span>
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#fde68a' }}>
                          {activeCommand.status === 'pending' && '⏳ Orden enviada. Esperando entrega al dispositivo...'}
                          {activeCommand.status === 'executing' && '⏳ El dispositivo recibió la orden. Procesando...'}
                        </div>
                      </div>
                    );
                  }

                  if (selectedVehicle.activeSessionId) {
                    return (
                      <div
                        style={{
                          padding: '0.625rem',
                          borderRadius: '0.375rem',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid #10b981',
                          color: '#6ee7b7',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.15rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, fontSize: '0.8rem' }}>
                          <span>🟢 SERVICIO GPS ACTIVO</span>
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#a7f3d0' }}>
                          Transmitiendo ubicación en tiempo real desde el móvil
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      style={{
                        padding: '0.625rem',
                        borderRadius: '0.375rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #ef4444',
                        color: '#fca5a5',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.15rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, fontSize: '0.8rem' }}>
                        <span>🔴 SERVICIO GPS DETENIDO</span>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#fecdd3' }}>
                        Sin transmisión activa desde el dispositivo
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Resultado / Notificación de Comando Finalizado o Error */}
                {activeCommand && (activeCommand.status === 'completed' || activeCommand.status === 'failed') && (
                  <div
                    style={{
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      backgroundColor:
                        activeCommand.status === 'completed'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      border:
                        activeCommand.status === 'completed'
                          ? '1px solid #10b981'
                          : '1px solid #ef4444',
                      color:
                        activeCommand.status === 'completed'
                          ? '#6ee7b7'
                          : '#fca5a5',
                    }}
                  >
                    {activeCommand.status === 'completed' ? (
                      <>
                        <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                        <span>✅ Orden ejecutada correctamente</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                        <span>❌ Error al ejecutar orden{activeCommand.errorMessage ? `: ${activeCommand.errorMessage}` : ''}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Advertencia de timeout si han pasado más de 15 segundos sin confirmación del móvil */}
                {commandTimerWarning && activeCommand?.status === 'pending' && (
                  <div style={{ fontSize: '0.7rem', color: '#fcd34d', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.375rem', borderRadius: '0.25rem', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    ⚠️ El dispositivo aún no confirma la recepción. Puede estar sin señal o apagado.
                  </div>
                )}

                {/* 3. Validación de Conductor Asignado */}
                {!selectedVehicle.driverId && (
                  <div
                    style={{
                      padding: '0.5rem',
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid #f59e0b',
                      borderRadius: '0.375rem',
                      color: '#fcd34d',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                    <span>⚠️ Sin conductor asignado para recibir órdenes</span>
                  </div>
                )}

                {/* 4. Botones de Acción de Control Remoto */}
                {(() => {
                  const hasDriver = Boolean(selectedVehicle.driverId);
                  const hasActiveSession = Boolean(selectedVehicle.activeSessionId);
                  const isBusy = isCommandSubmitting || activeCommand?.status === 'pending' || activeCommand?.status === 'executing';

                  if (!hasDriver) {
                    return null;
                  }

                  if (!hasActiveSession) {
                    return (
                      <button
                        onClick={() => handleSendGpsCommand('ACTIVAR_GPS')}
                        disabled={isBusy}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: isBusy ? '#475569' : '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: isBusy ? 'not-allowed' : 'pointer',
                          width: '100%',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {isBusy ? (
                          <>
                            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Procesando...</span>
                          </>
                        ) : (
                          <>
                            <span>🟢 INICIAR SERVICIO GPS</span>
                          </>
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => setShowStopConfirmModal(true)}
                      disabled={isBusy}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: isBusy ? '#475569' : '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: isBusy ? 'not-allowed' : 'pointer',
                        width: '100%',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {isBusy ? (
                        <>
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <span>🔴 DETENER SERVICIO GPS</span>
                        </>
                      )}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Modal de Confirmación antes de Detener Servicio GPS */}
          {showStopConfirmModal && selectedVehicle && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #ef4444',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  maxWidth: '420px',
                  width: '100%',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                  <AlertTriangle size={24} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                    Confirmar Detención de Servicio GPS
                  </h3>
                </div>

                <p style={{ margin: 0, fontSize: '0.875rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  ¿Está seguro de que desea detener el servicio GPS del vehículo <strong>Taxi {selectedVehicle.plate}</strong>?
                </p>

                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderLeft: '4px solid #ef4444',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    color: '#fca5a5',
                    lineHeight: 1.4,
                  }}
                >
                  ⚠️ El dispositivo móvil del conductor dejará de transmitir su ubicación en tiempo real.
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowStopConfirmModal(false)}
                    disabled={isCommandSubmitting}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#334155',
                      color: '#f8fafc',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setShowStopConfirmModal(false);
                      await handleSendGpsCommand('DESACTIVAR_GPS');
                    }}
                    disabled={isCommandSubmitting}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                    }}
                  >
                    Detener GPS
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MonitoreoGpsPage;

