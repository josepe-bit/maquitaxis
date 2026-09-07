import React, { useEffect, useState, useMemo } from 'react';
import {
  getActiveVehiclesTracking,
  subscribeToTrackingRealtime,
  type ActiveVehicleTracking,
} from '../services/trackingService';
import GpsMap from '../components/GpsMap';
import { Search, RefreshCw, Radio, Car, ShieldAlert, CheckCircle2, Phone } from 'lucide-react';

export const MonitoreoGpsPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<ActiveVehicleTracking[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Cargar lista de vehículos
  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await getActiveVehiclesTracking();
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

    // Suscribirse a Supabase Realtime
    const unsubscribe = subscribeToTrackingRealtime(() => {
      setIsRealtimeActive(true);
      loadData();
    });

    setIsRealtimeActive(true);

    return () => {
      unsubscribe();
      setIsRealtimeActive(false);
    };
  }, []);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f172a' }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.875rem 1.5rem',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
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
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Panel Lateral Listado */}
        <aside
          style={{
            width: '380px',
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
                const hasCoords = v.lastKnownLat != null && v.lastKnownLng != null;

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
                      <span style={{ color: hasCoords ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                        {hasCoords ? '📍 Ubicación disponible' : '⚠️ Sin coordenadas GPS'}
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
        <main style={{ flex: 1, position: 'relative' }}>
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
                width: '280px',
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
                {selectedVehicle.lastLocationAt && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Última actualización: {new Date(selectedVehicle.lastLocationAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MonitoreoGpsPage;
