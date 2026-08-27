import React, { useState, useEffect } from 'react';
import { servicioAppService, ServicioAppWithStats, CreateServicioAppInput, UpdateServicioAppInput } from '../services/servicioAppService';
import { adminService } from '../services/adminService';
import { Tercero, ServiceLevel, ServiceStatus } from '@maquitaxis/shared';
import { Building2, Plus, RefreshCw, ShieldAlert, ShieldCheck, CheckCircle2, XCircle, Edit3, Car, Calendar, Users, X } from 'lucide-react';

export const ServiciosManagementPage: React.FC = () => {
  const [servicios, setServicios] = useState<ServicioAppWithStats[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingServicio, setEditingServicio] = useState<ServicioAppWithStats | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [terceroId, setTerceroId] = useState('');
  const [level, setLevel] = useState<ServiceLevel>(2);
  const [status, setStatus] = useState<ServiceStatus>('activo');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, tList] = await Promise.all([
        servicioAppService.fetchServiciosWithStats(),
        adminService.fetchTerceros(),
      ]);
      setServicios(sList);
      setTerceros(tList);
      if (tList.length > 0) {
        setTerceroId(tList[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingServicio(null);
    setErrorMsg(null);
    setName('');
    if (terceros.length > 0) setTerceroId(terceros[0].id);
    setLevel(2);
    setStatus('activo');
    setStartDate(new Date().toISOString().substring(0, 10));
    setEndDate('');
    setShowModal(true);
  };

  const handleOpenEditModal = (s: ServicioAppWithStats) => {
    setEditingServicio(s);
    setErrorMsg(null);
    setName(s.name);
    setTerceroId(s.terceroId);
    setLevel(s.level);
    setStatus(s.status);
    setStartDate(s.startDate ? s.startDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
    setEndDate(s.endDate ? s.endDate.substring(0, 10) : '');
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('El nombre de la empresa / servicio es obligatorio.');
      return;
    }
    if (!terceroId) {
      setErrorMsg('Seleccione un tercero cliente representante.');
      return;
    }

    setSaving(true);
    try {
      if (editingServicio) {
        const updateInput: UpdateServicioAppInput = {
          name: name.trim(),
          terceroId,
          level,
          status,
          startDate,
          endDate: endDate || undefined,
        };
        await servicioAppService.updateServicioApp(editingServicio.id, updateInput);
      } else {
        const createInput: CreateServicioAppInput = {
          name: name.trim(),
          terceroId,
          level,
          status,
          startDate,
          endDate: endDate || undefined,
        };
        await servicioAppService.createServicioApp(createInput);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el servicio.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (s: ServicioAppWithStats) => {
    const actionText = s.status === 'activo' ? 'inactivar' : 'activar';
    if (!window.confirm(`¿Desea ${actionText} el servicio de la empresa "${s.name}"?`)) return;

    try {
      await servicioAppService.toggleServicioStatus(s.id, s.status);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado.');
    }
  };

  const totalActive = servicios.filter((s) => s.status === 'activo').length;
  const level1Count = servicios.filter((s) => s.level === 1 && s.status === 'activo').length;
  const level2Count = servicios.filter((s) => s.level === 2 && s.status === 'activo').length;
  const totalTaxisMatriculados = servicios.reduce((acc, curr) => acc + curr.taxisCount, 0);

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 color="var(--primary)" />
            <span>Servicios de Suscripción y Clientes de la App</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Administra las empresas y propietarios contratantes. Un servicio activo permite matricular taxis en la plataforma.
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
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--primary)',
              color: 'var(--bg-dark)',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: '800',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            <span>Nuevo Servicio</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Servicios Activos Total</span>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.25rem' }}>{totalActive}</p>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Superusuarios (Nivel 1)</span>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f59e0b', marginTop: '0.25rem' }}>{level1Count}</p>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Empresas Contratantes (Nivel 2)</span>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.25rem' }}>{level2Count}</p>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Taxis Matriculados</span>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981', marginTop: '0.25rem' }}>{totalTaxisMatriculados}</p>
        </div>
      </div>

      {/* Tabla de Servicios */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando catálogo de servicios de suscripción...</div>
        ) : servicios.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay servicios registrados.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-dark)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Empresa / Servicio Contratante</th>
                <th style={{ padding: '0.75rem 1rem' }}>Representante Tercero</th>
                <th style={{ padding: '0.75rem 1rem' }}>Nivel de Acceso</th>
                <th style={{ padding: '0.75rem 1rem' }}>Taxis Matriculados</th>
                <th style={{ padding: '0.75rem 1rem' }}>Vigencia</th>
                <th style={{ padding: '0.75rem 1rem' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {servicios.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: 'var(--primary)' }}>
                    🏢 {s.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                    {s.tercero ? `${s.tercero.name} (${s.tercero.docNumber})` : 'Sin Representante'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {s.level === 1 ? (
                      <span className="badge" style={{ background: '#f59e0b', color: '#0f172a' }}>Nivel 1 - Superusuario</span>
                    ) : (
                      <span className="badge" style={{ background: '#38bdf8', color: '#0f172a' }}>Nivel 2 - Empresa</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#10b981' }}>
                    🚕 {s.taxisCount} Taxis
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {new Date(s.startDate).toLocaleDateString()} {s.endDate ? `al ${new Date(s.endDate).toLocaleDateString()}` : '(Indefinido)'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${s.status === 'activo' ? 'badge-service' : 'badge-available'}`}>
                      {s.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenEditModal(s)}
                        title="Editar Servicio"
                        style={{ padding: '0.4rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(s)}
                        title={s.status === 'activo' ? 'Inactivar Servicio' : 'Activar Servicio'}
                        style={{
                          padding: '0.4rem',
                          background: s.status === 'activo' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: s.status === 'activo' ? '#ef4444' : '#10b981',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        {s.status === 'activo' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear / Editar Servicio */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '100%', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>
                {editingServicio ? `Editar Servicio "${editingServicio.name}"` : 'Registrar Nuevo Servicio de Suscripción'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Nombre de la Empresa / Servicio Contratante *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Taxi Express Santa Marta S.A.S."
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Representante Tercero (Cliente Contratante) *
                </label>
                <select
                  value={terceroId}
                  onChange={(e) => setTerceroId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  required
                >
                  {terceros.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.docType} {t.docNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Nivel de Acceso *
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value) as ServiceLevel)}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  >
                    <option value={1}>Nivel 1 - Superusuario Global</option>
                    <option value={2}>Nivel 2 - Empresa Contratante</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Estado *
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  >
                    <option value="activo">activo</option>
                    <option value="inactivo">inactivo</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Fecha Fin (Opcional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.6rem 1.2rem', background: 'var(--primary)', border: 'none', color: 'var(--bg-dark)', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}
                >
                  {saving ? 'Guardando...' : editingServicio ? 'Guardar Cambios' : 'Crear Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
