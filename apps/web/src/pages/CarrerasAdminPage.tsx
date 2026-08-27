import React, { useState, useEffect } from 'react';
import { carreraAdminService, CreateCarreraInput } from '../services/carreraAdminService';
import { adminService } from '../services/adminService';
import { Carrera, Vehiculo, CarreraStatus } from '@maquitaxis/shared';
import { Navigation, Plus, RefreshCw, Car, CheckCircle2, XCircle, Clock, UserCheck } from 'lucide-react';

export const CarrerasAdminPage: React.FC = () => {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [assigningCarrera, setAssigningCarrera] = useState<Carrera | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form New Carrera
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Assign Form
  const [selectedVehiculoId, setSelectedVehiculoId] = useState('');

  useEffect(() => {
    loadData();

    // Suscribirse a cambios Realtime de la tabla carreras
    const unsubscribe = carreraAdminService.subscribeToCarrerasRealtime(() => {
      loadCarreras();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCarreras(), loadVehiculos()]);
    } finally {
      setLoading(false);
    }
  };

  const loadCarreras = async () => {
    const list = await carreraAdminService.fetchCarreras();
    setCarreras(list);
  };

  const loadVehiculos = async () => {
    const list = await adminService.fetchVehiculos();
    setVehiculos(list);
    // Seleccionar por defecto el primer vehículo disponible
    const available = list.find((v) => v.driverId);
    if (available) {
      setSelectedVehiculoId(available.id);
    }
  };

  const handleCreateCarrera = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!clientName.trim() || !clientPhone.trim() || !originAddress.trim() || !destinationAddress.trim()) {
      setErrorMsg('Por favor complete todos los campos obligatorios.');
      return;
    }

    setSaving(true);
    try {
      const input: CreateCarreraInput = {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        originAddress: originAddress.trim(),
        destinationAddress: destinationAddress.trim(),
        notes: notes.trim() || undefined,
      };

      await carreraAdminService.createCarrera(input);
      setShowCreateModal(false);
      setClientName('');
      setClientPhone('');
      setOriginAddress('');
      setDestinationAddress('');
      setNotes('');
      await loadCarreras();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al solicitar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningCarrera || !selectedVehiculoId) return;

    const targetVehiculo = vehiculos.find((v) => v.id === selectedVehiculoId);
    if (!targetVehiculo || !targetVehiculo.driverId) {
      setErrorMsg('El vehículo seleccionado debe contar con un conductor asignado.');
      return;
    }

    setSaving(true);
    try {
      await carreraAdminService.assignVehiculoToCarrera(
        assigningCarrera.id,
        targetVehiculo.id,
        targetVehiculo.driverId
      );
      setAssigningCarrera(null);
      await loadCarreras();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al asignar el taxi.');
    } finally {
      setSaving(false);
    }
  };

  const pendingCarreras = carreras.filter((c) => c.status === 'pendiente');
  const activeCarreras = carreras.filter((c) => ['asignado', 'aceptado', 'en_curso'].includes(c.status));
  const completedCarreras = carreras.filter((c) => ['completado', 'cancelado'].includes(c.status));

  // Taxis con conductor disponibles para recibir servicios
  const availableVehiculos = vehiculos.filter((v) => v.driverId);

  const getStatusBadge = (st: CarreraStatus) => {
    switch (st) {
      case 'pendiente':
        return <span className="badge" style={{ background: '#f59e0b', color: '#0f172a' }}>PENDIENTE</span>;
      case 'asignado':
        return <span className="badge" style={{ background: '#38bdf8', color: '#0f172a' }}>ASIGNADO</span>;
      case 'aceptado':
        return <span className="badge" style={{ background: '#8b5cf6', color: '#fff' }}>ACEPTADO</span>;
      case 'en_curso':
        return <span className="badge badge-service">EN CURSO</span>;
      case 'completado':
        return <span className="badge badge-available">COMPLETADO</span>;
      case 'cancelado':
        return <span className="badge" style={{ background: '#ef4444', color: '#fff' }}>CANCELADO</span>;
    }
  };

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Navigation color="var(--primary)" />
            <span>Gestión y Despacho de Carreras</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Despacha servicios de taxi en tiempo real a los conductores disponibles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--primary)',
              color: 'var(--bg-dark)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            <span>Solicitar Carrera</span>
          </button>
        </div>
      </div>

      {/* Grid: Servicios Pendientes y Activos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Panel Pendientes */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} />
            <span>Servicios Pendientes ({pendingCarreras.length})</span>
          </h3>

          {pendingCarreras.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>No hay solicitudes de carreras pendientes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingCarreras.map((c) => (
                <div key={c.id} style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>{c.clientName} ({c.clientPhone})</span>
                    {getStatusBadge(c.status)}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}><strong>Origen:</strong> {c.originAddress}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}><strong>Destino:</strong> {c.destinationAddress}</p>
                  {c.notes && <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>Notas: {c.notes}</p>}

                  <button
                    onClick={() => {
                      setAssigningCarrera(c);
                      setErrorMsg(null);
                    }}
                    style={{
                      marginTop: '0.75rem',
                      width: '100%',
                      padding: '0.5rem',
                      background: 'var(--primary)',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'var(--bg-dark)',
                      fontWeight: '800',
                      cursor: 'pointer',
                    }}
                  >
                    ASIGNAR TAXI DISPONIBLE
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel En Curso / Asignadas */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={18} />
            <span>Servicios Asignados / En Curso ({activeCarreras.length})</span>
          </h3>

          {activeCarreras.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontStyle: 'italic' }}>No hay carreras asignadas o en curso actualmente.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeCarreras.map((c) => (
                <div key={c.id} style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '700', color: 'var(--primary)' }}>Taxi {c.vehiculo?.plate || '---'}</span>
                    {getStatusBadge(c.status)}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>Cliente: {c.clientName} ({c.clientPhone})</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Ruta: {c.originAddress} → {c.destinationAddress}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', marginTop: '0.25rem' }}>Conductor: {c.driver?.name || '---'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial de Carreras Completadas */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-main)' }}>
          Historial Reciente de Servicios
        </h3>

        {completedCarreras.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No hay carreras finalizadas.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-dark)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem' }}>Fecha / Hora</th>
                <th style={{ padding: '0.75rem' }}>Cliente</th>
                <th style={{ padding: '0.75rem' }}>Ruta (Origen → Destino)</th>
                <th style={{ padding: '0.75rem' }}>Taxi / Conductor</th>
                <th style={{ padding: '0.75rem' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {completedCarreras.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem', fontWeight: '600' }}>{c.clientName}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{c.originAddress} → {c.destinationAddress}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--primary)' }}>Taxi {c.vehiculo?.plate || '---'} ({c.driver?.name || '---'})</td>
                  <td style={{ padding: '0.75rem' }}>{getStatusBadge(c.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Solicitar Carrera */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '460px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--primary)' }}>
              Nueva Solicitud de Servicio / Carrera
            </h3>

            {errorMsg && (
              <p style={{ color: 'var(--status-error)', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleCreateCarrera} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: María Gómez"
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    required
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+573001234567"
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Dirección de Origen (Recoger en)
                </label>
                <input
                  type="text"
                  value={originAddress}
                  onChange={(e) => setOriginAddress(e.target.value)}
                  placeholder="Ej: Cra 4 # 22-10 Centro Historic"
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Dirección de Destino
                </label>
                <input
                  type="text"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="Ej: El Rodadero Calle 6 # 3-12"
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Observaciones adicionales
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Lleva maleta grande"
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.5rem 1rem', background: 'var(--primary)', border: 'none', color: 'var(--bg-dark)', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {saving ? 'Creando...' : 'Crear Carrera (Pendiente)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Taxi */}
      {assigningCarrera && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '450px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--primary)' }}>
              Asignar Taxi a Carrera
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Cliente: <strong>{assigningCarrera.clientName}</strong> ({assigningCarrera.originAddress})
            </p>

            {errorMsg && (
              <p style={{ color: 'var(--status-error)', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </p>
            )}

            <form onSubmit={handleAssignVehiculo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  Seleccionar Taxi Disponible
                </label>
                <select
                  value={selectedVehiculoId}
                  onChange={(e) => setSelectedVehiculoId(e.target.value)}
                  style={{ width: '100%', padding: '0.56rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                >
                  {availableVehiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      Taxi {v.plate} - Conductor: {v.driver?.name || 'No asignado'} ({v.status})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setAssigningCarrera(null)}
                  style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.5rem 1rem', background: 'var(--primary)', border: 'none', color: 'var(--bg-dark)', borderRadius: '4px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {saving ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
