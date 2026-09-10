import React, { useEffect, useState, useMemo } from 'react';
import { getVehicleAlertsOverview } from '../services/alertService';
import type { VehicleAlert, AlertsOverviewSummary, AlertState } from '@maquitaxis/shared';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  MinusCircle,
  RefreshCw,
  Search,
  Filter,
  Car,
  User,
  Gauge,
  Calendar,
  ShieldAlert,
} from 'lucide-react';

interface AlertsOverviewWidgetProps {
  onRefreshFinished?: () => void;
}

export const AlertsOverviewWidget: React.FC<AlertsOverviewWidgetProps> = ({ onRefreshFinished }) => {
  const [data, setData] = useState<AlertsOverviewSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros interactivos del panorama
  const [selectedState, setSelectedState] = useState<string>('todos');
  const [selectedVehiculo, setSelectedVehiculo] = useState<string>('todos');
  const [selectedDriver, setSelectedDriver] = useState<string>('todos');
  const [selectedEvento, setSelectedEvento] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await getVehicleAlertsOverview();
      setData(res);
      if (onRefreshFinished) onRefreshFinished();
    } catch (err: any) {
      console.error('Error al cargar panorama de alertas:', err);
      setErrorMessage(err.message || 'Error al obtener panorama de alertas de mantenimientos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // Lista de vehículos únicos para el filtro
  const uniqueVehicles = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { id: string; plate: string }>();
    data.alerts.forEach((a) => {
      if (!map.has(a.vehiculoId)) {
        map.set(a.vehiculoId, { id: a.vehiculoId, plate: a.plate });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.plate.localeCompare(b.plate));
  }, [data]);

  // Lista de conductores únicos para el filtro
  const uniqueDrivers = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { id: string; name: string }>();
    data.alerts.forEach((a) => {
      if (a.driverId && a.driverName && !map.has(a.driverId)) {
        map.set(a.driverId, { id: a.driverId, name: a.driverName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Lista de eventos únicos para el filtro
  const uniqueEvents = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { id: string; name: string }>();
    data.alerts.forEach((a) => {
      if (!map.has(a.eventoId)) {
        map.set(a.eventoId, { id: a.eventoId, name: a.eventoName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Filtrado reactivo de alertas
  const filteredAlerts = useMemo(() => {
    if (!data) return [];
    return data.alerts.filter((item) => {
      // Estado
      if (selectedState !== 'todos' && item.state !== selectedState) return false;
      // Vehículo
      if (selectedVehiculo !== 'todos' && item.vehiculoId !== selectedVehiculo) return false;
      // Conductor
      if (selectedDriver !== 'todos' && item.driverId !== selectedDriver) return false;
      // Evento
      if (selectedEvento !== 'todos' && item.eventoId !== selectedEvento) return false;
      // Búsqueda por texto (placa, evento, motivo, conductor)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesPlate = item.plate.toLowerCase().includes(term);
        const matchesEvent = item.eventoName.toLowerCase().includes(term);
        const matchesReason = item.reason.toLowerCase().includes(term);
        const matchesDriver = (item.driverName || '').toLowerCase().includes(term);
        if (!matchesPlate && !matchesEvent && !matchesReason && !matchesDriver) return false;
      }
      return true;
    });
  }, [data, selectedState, selectedVehiculo, selectedDriver, selectedEvento, searchTerm]);

  // Función auxiliar para renderizar insignias de estado (Section 2, Section 18)
  const renderStateBadge = (state: AlertState) => {
    switch (state) {
      case 'VENCIDO':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            <AlertCircle size={14} /> 🔴 VENCIDO
          </span>
        );
      case 'PROXIMO':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fde047', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            <AlertTriangle size={14} /> 🟡 PRÓXIMO
          </span>
        );
      case 'NORMAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#6ee7b7', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            <CheckCircle2 size={14} /> 🟢 NORMAL
          </span>
        );
      case 'SIN_DATOS':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(148, 163, 184, 0.2)', border: '1px solid #94a3b8', color: '#cbd5e1', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            <MinusCircle size={14} /> ⚪ SIN DATOS
          </span>
        );
      case 'SIN_HISTORIAL':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#7dd3fc', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
            <HelpCircle size={14} /> 🔵 SIN HISTORIAL
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <section
      style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Header del Módulo de Alertas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldAlert size={26} color="#ef4444" />
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Panorama de Alertas de Mantenimiento y Vencimientos
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              Monitoreo determinístico por kilometraje, vigencia de documentos y control de ciclos
            </p>
          </div>
        </div>

        <button
          onClick={loadAlerts}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#334155',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Actualizar Alertas</span>
        </button>
      </div>

      {/* Tarjetas de Resumen Superior (Section 18) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
        {/* Vencidos */}
        <div
          onClick={() => setSelectedState(selectedState === 'VENCIDO' ? 'todos' : 'VENCIDO')}
          style={{
            backgroundColor: selectedState === 'VENCIDO' ? 'rgba(239, 68, 68, 0.25)' : '#0f172a',
            border: '1px solid #ef4444',
            borderRadius: '10px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fca5a5', fontSize: '0.75rem', fontWeight: 700 }}>
            <span>🔴 VENCIDOS</span>
            <AlertCircle size={16} />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ef4444', margin: '0.4rem 0 0 0' }}>
            {data ? data.vencidos : 0}
          </p>
        </div>

        {/* Próximos */}
        <div
          onClick={() => setSelectedState(selectedState === 'PROXIMO' ? 'todos' : 'PROXIMO')}
          style={{
            backgroundColor: selectedState === 'PROXIMO' ? 'rgba(245, 158, 11, 0.25)' : '#0f172a',
            border: '1px solid #f59e0b',
            borderRadius: '10px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fde047', fontSize: '0.75rem', fontWeight: 700 }}>
            <span>🟡 PRÓXIMOS</span>
            <AlertTriangle size={16} />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b', margin: '0.4rem 0 0 0' }}>
            {data ? data.proximos : 0}
          </p>
        </div>

        {/* Normales */}
        <div
          onClick={() => setSelectedState(selectedState === 'NORMAL' ? 'todos' : 'NORMAL')}
          style={{
            backgroundColor: selectedState === 'NORMAL' ? 'rgba(16, 185, 129, 0.25)' : '#0f172a',
            border: '1px solid #10b981',
            borderRadius: '10px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6ee7b7', fontSize: '0.75rem', fontWeight: 700 }}>
            <span>🟢 NORMALES</span>
            <CheckCircle2 size={16} />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', margin: '0.4rem 0 0 0' }}>
            {data ? data.normales : 0}
          </p>
        </div>

        {/* Sin Datos */}
        <div
          onClick={() => setSelectedState(selectedState === 'SIN_DATOS' ? 'todos' : 'SIN_DATOS')}
          style={{
            backgroundColor: selectedState === 'SIN_DATOS' ? 'rgba(148, 163, 184, 0.25)' : '#0f172a',
            border: '1px solid #94a3b8',
            borderRadius: '10px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700 }}>
            <span>⚪ SIN DATOS</span>
            <MinusCircle size={16} />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#94a3b8', margin: '0.4rem 0 0 0' }}>
            {data ? data.sinDatos : 0}
          </p>
        </div>

        {/* Sin Historial */}
        <div
          onClick={() => setSelectedState(selectedState === 'SIN_HISTORIAL' ? 'todos' : 'SIN_HISTORIAL')}
          style={{
            backgroundColor: selectedState === 'SIN_HISTORIAL' ? 'rgba(56, 189, 248, 0.25)' : '#0f172a',
            border: '1px solid #38bdf8',
            borderRadius: '10px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7dd3fc', fontSize: '0.75rem', fontWeight: 700 }}>
            <span>🔵 SIN HISTORIAL</span>
            <HelpCircle size={16} />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', margin: '0.4rem 0 0 0' }}>
            {data ? data.sinHistorial : 0}
          </p>
        </div>
      </div>

      {/* Barra de Filtros Específicos (Section 20) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          padding: '1rem',
          backgroundColor: '#0f172a',
          borderRadius: '10px',
          border: '1px solid #334155',
        }}
      >
        {/* Filtro por Estado */}
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
            ESTADO DE ALERTA
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="todos">Todos los estados</option>
            <option value="VENCIDO">🔴 VENCIDO</option>
            <option value="PROXIMO">🟡 PRÓXIMO</option>
            <option value="NORMAL">🟢 NORMAL</option>
            <option value="SIN_DATOS">⚪ SIN DATOS</option>
            <option value="SIN_HISTORIAL">🔵 SIN HISTORIAL</option>
          </select>
        </div>

        {/* Filtro por Vehículo */}
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
            VEHÍCULO / TAXI
          </label>
          <select
            value={selectedVehiculo}
            onChange={(e) => setSelectedVehiculo(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="todos">Todos los taxis</option>
            {uniqueVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                🚕 {v.plate}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Conductor */}
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
            CONDUCTOR
          </label>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="todos">Todos los conductores</option>
            {uniqueDrivers.map((c) => (
              <option key={c.id} value={c.id}>
                👤 {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Evento */}
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
            EVENTO
          </label>
          <select
            value={selectedEvento}
            onChange={(e) => setSelectedEvento(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.6rem',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="todos">Todos los eventos</option>
            {uniqueEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                🛡️ {ev.name}
              </option>
            ))}
          </select>
        </div>

        {/* Búsqueda rápida por Placa / Texto */}
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.25rem' }}>
            BÚSQUEDA RÁPIDA
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar por placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem 0.4rem 1.8rem',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      {/* Manejo de Errores */}
      {errorMessage && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {/* Tabla Detalle del Panorama (Section 19) */}
      <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem' }}>
              <th style={{ padding: '0.75rem 1rem' }}>PLACA / TAXI</th>
              <th style={{ padding: '0.75rem 1rem' }}>EVENTO</th>
              <th style={{ padding: '0.75rem 1rem' }}>ESTADO</th>
              <th style={{ padding: '0.75rem 1rem' }}>KM. ACTUAL</th>
              <th style={{ padding: '0.75rem 1rem' }}>FECHA EVENTO</th>
              <th style={{ padding: '0.75rem 1rem' }}>KM. REGISTRO EVENTO</th>
              <th style={{ padding: '0.75rem 1rem' }}>PRÓXIMO CAMBIO</th>
              <th style={{ padding: '0.75rem 1rem' }}>FALTAN</th>
              <th style={{ padding: '0.75rem 1rem' }}>FECHA OBJETIVO</th>
              <th style={{ padding: '0.75rem 1rem' }}>DÍAS RESTANTES</th>
              <th style={{ padding: '0.75rem 1rem' }}>MOTIVO DE LA ALERTA</th>
              <th style={{ padding: '0.75rem 1rem' }}>CONDUCTOR</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Cargando panorama de alertas...
                </td>
              </tr>
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  No se encontraron alertas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((item, idx) => (
                <tr
                  key={`${item.vehiculoId}_${item.eventoId}_${idx}`}
                  style={{
                    borderBottom: '1px solid #334155',
                    backgroundColor: idx % 2 === 0 ? '#1e293b' : '#172033',
                  }}
                >
                  {/* 1. Placa / Taxi */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Car size={15} color="#f59e0b" />
                      <span>{item.plate}</span>
                    </div>
                    {item.model && <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>{item.model}</span>}
                  </td>

                  {/* 2. Evento */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#38bdf8' }}>
                    {item.eventoName}
                  </td>

                  {/* 3. Estado */}
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {renderStateBadge(item.state)}
                  </td>

                  {/* 4. Km. Actual */}
                  <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                    {item.currentMileage != null ? `${Math.round(item.currentMileage).toLocaleString('es-CO')} km` : '—'}
                  </td>

                  {/* 5. Fecha Evento */}
                  <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                    {item.lastChangeDate ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{item.lastChangeDate}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b' }}>—</span>
                    )}
                  </td>

                  {/* 6. Km. Registro Evento */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f8fafc' }}>
                    {item.lastChangeMileage != null ? `${Math.round(item.lastChangeMileage).toLocaleString('es-CO')} km` : '—'}
                  </td>

                  {/* 7. Próximo Cambio */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#f59e0b' }}>
                    {item.targetMileage != null ? `${Math.round(item.targetMileage).toLocaleString('es-CO')} km` : '—'}
                  </td>

                  {/* 8. Faltan */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: item.remainingKms != null && item.remainingKms < 0 ? '#ef4444' : '#f8fafc' }}>
                    {item.remainingKms != null
                      ? item.remainingKms < 0
                        ? `${Math.abs(item.remainingKms).toLocaleString('es-CO')} km excedidos`
                        : `${item.remainingKms.toLocaleString('es-CO')} km`
                      : '—'}
                  </td>

                  {/* 9. Fecha Objetivo */}
                  <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                    {item.targetDate ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{item.targetDate}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b' }}>—</span>
                    )}
                  </td>

                  {/* 10. Días Restantes */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: item.remainingDays != null && item.remainingDays < 0 ? '#ef4444' : '#f8fafc' }}>
                    {item.remainingDays != null
                      ? item.remainingDays < 0
                        ? `${Math.abs(item.remainingDays)} días vencido`
                        : `${item.remainingDays} días`
                      : 'N/A'}
                  </td>

                  {/* 11. Motivo de la Alerta */}
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.78rem' }}>
                    {item.reason}
                  </td>

                  {/* 12. Conductor */}
                  <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                    {item.driverName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <User size={13} color="#a855f7" />
                        <span>{item.driverName}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontStyle: 'italic' }}>Sin asignar</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AlertsOverviewWidget;
