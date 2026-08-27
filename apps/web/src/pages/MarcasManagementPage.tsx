import React, { useState, useEffect } from 'react';
import { marcaService } from '../services/marcaService';
import { MarcaWithStats, CreateMarcaInput, UpdateMarcaInput } from '@maquitaxis/shared';
import { Tag, Plus, RefreshCw, Search, Edit3, Trash2, Car, Globe, X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const MarcasManagementPage: React.FC = () => {
  const [marcas, setMarcas] = useState<MarcaWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State para Crear / Editar
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingMarca, setEditingMarca] = useState<MarcaWithStats | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del formulario
  const [name, setName] = useState<string>('');
  const [country, setCountry] = useState<string>('');

  // Modal de confirmación de eliminación
  const [deletingMarca, setDeletingMarca] = useState<MarcaWithStats | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadMarcas();
  }, []);

  const loadMarcas = async () => {
    setLoading(true);
    try {
      const data = await marcaService.fetchMarcasWithStats();
      setMarcas(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar las marcas de vehículos.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingMarca(null);
    setName('');
    setCountry('');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (m: MarcaWithStats) => {
    setEditingMarca(m);
    setName(m.name);
    setCountry(m.country || '');
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('El nombre de la marca es obligatorio.');
      return;
    }

    setSaving(true);
    try {
      if (editingMarca) {
        const updateInput: UpdateMarcaInput = {
          name: name.trim(),
          country: country.trim() || undefined,
        };
        await marcaService.updateMarca(editingMarca.id, updateInput);
        setFeedback({ type: 'success', message: `Marca "${name.trim()}" actualizada exitosamente.` });
      } else {
        const createInput: CreateMarcaInput = {
          name: name.trim(),
          country: country.trim() || undefined,
        };
        await marcaService.createMarca(createInput);
        setFeedback({ type: 'success', message: `Marca "${name.trim()}" registrada exitosamente.` });
      }
      setShowModal(false);
      await loadMarcas();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la marca.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMarca) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await marcaService.deleteMarca(deletingMarca.id);
      setFeedback({ type: 'success', message: `Marca "${deletingMarca.name}" eliminada correctamente.` });
      setDeletingMarca(null);
      await loadMarcas();
    } catch (err: any) {
      setDeleteError(err.message || 'No se pudo eliminar la marca.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtrado de marcas por término de búsqueda
  const filteredMarcas = marcas.filter((m) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || (m.country && m.country.toLowerCase().includes(q));
  });

  // Métricas calculadas
  const totalMarcas = marcas.length;
  const marcasConVehiculos = marcas.filter((m) => m.vehiculosCount > 0).length;
  const totalVehiculosConMarca = marcas.reduce((acc, m) => acc + m.vehiculosCount, 0);

  // Encontrar el país con más marcas
  const countryCounts: Record<string, number> = {};
  marcas.forEach((m) => {
    if (m.country) {
      countryCounts[m.country] = (countryCounts[m.country] || 0) + 1;
    }
  });
  let topCountry = 'N/A';
  let maxCount = 0;
  Object.entries(countryCounts).forEach(([c, cnt]) => {
    if (cnt > maxCount) {
      maxCount = cnt;
      topCountry = c;
    }
  });

  return (
    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-dark)', color: 'var(--text-primary)' }}>
      {/* Banner Encabezado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-card)',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(250, 204, 21, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}
          >
            <Tag size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
              Catálogo de Marcas de Vehículos
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Gestión de marcas de los taxis y vehículos registrados en MaquiTaxis
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadMarcas}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-dark)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary)',
              color: 'var(--bg-dark)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(250, 204, 21, 0.25)',
            }}
          >
            <Plus size={18} />
            <span>Nueva Marca</span>
          </button>
        </div>
      </div>

      {/* Banner de Retroalimentación / Alerta global */}
      {feedback && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: feedback.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444',
            color: feedback.type === 'success' ? '#4ade80' : '#f87171',
            fontSize: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tarjetas de Métricas Estadísticas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.15rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Marcas
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)' }}>{totalMarcas}</span>
            <Tag size={24} color="var(--primary)" opacity={0.6} />
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.15rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Marcas Activas en Flota
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#60a5fa' }}>{marcasConVehiculos}</span>
            <Car size={24} color="#60a5fa" opacity={0.6} />
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.15rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Vehículos con Marca
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#4ade80' }}>{totalVehiculosConMarca}</span>
            <Car size={24} color="#4ade80" opacity={0.6} />
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.15rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Origen Principal
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>{topCountry}</span>
            <Globe size={24} color="var(--text-secondary)" opacity={0.6} />
          </div>
        </div>
      </div>

      {/* Buscador y Controles */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
          <Search
            size={18}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre de marca o país..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Mostrando <strong>{filteredMarcas.length}</strong> de <strong>{totalMarcas}</strong> marcas
        </span>
      </div>

      {/* Estado Cargando */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p style={{ fontSize: '0.95rem' }}>Cargando catálogo de marcas...</p>
        </div>
      ) : filteredMarcas.length === 0 ? (
        /* Estado Vacío */
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color)',
            margin: '1rem 0',
          }}
        >
          <Tag size={48} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
            No se encontraron marcas de vehículos
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 1.25rem auto' }}>
            {searchTerm
              ? `No existen coincidencias para "${searchTerm}". Intenta con otros términos.`
              : 'Aún no se han registrado marcas en el catálogo.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenCreateModal}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: 'var(--bg-dark)',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Registrar Primera Marca
            </button>
          )}
        </div>
      ) : (
        /* Grilla de Tarjetas de Marcas */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredMarcas.map((m) => (
            <div
              key={m.id}
              style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: 'rgba(250, 204, 21, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)',
                        fontWeight: '800',
                        fontSize: '0.9rem',
                      }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--primary)' }}>
                        {m.name}
                      </h3>
                      {m.country ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                          <Globe size={12} /> {m.country}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.1rem' }}>
                          País no especificado
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`badge ${m.vehiculosCount > 0 ? 'badge-service' : ''}`}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '12px',
                      background: m.vehiculosCount > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: m.vehiculosCount > 0 ? '#4ade80' : 'var(--text-secondary)',
                      border: m.vehiculosCount > 0 ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color)',
                      fontWeight: '600',
                    }}
                  >
                    {m.vehiculosCount} vehículo(s)
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                }}
              >
                <button
                  onClick={() => handleOpenEditModal(m)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-dark)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                  }}
                  title="Editar marca"
                >
                  <Edit3 size={14} />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => {
                    setDeleteError(null);
                    setDeletingMarca(m);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#f87171',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                  }}
                  title="Eliminar marca"
                >
                  <Trash2 size={14} />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR MARCA */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              width: '100%',
              maxWidth: '480px',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Tag size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                  {editingMarca ? 'Editar Marca de Vehículo' : 'Registrar Nueva Marca'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario Body */}
            <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem' }}>
              {formError && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Nombre de la Marca <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Hyundai, Chevrolet, Kia, Renault"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-dark)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  País de Origen <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="ej: Corea del Sur, Estados Unidos, Francia, Japón"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-dark)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Footer Modal Acciones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.3rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'var(--bg-dark)',
                    fontWeight: '700',
                    cursor: saving ? 'wait' : 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{editingMarca ? 'Guardar Cambios' : 'Registrar Marca'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN */}
      {deletingMarca && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              width: '100%',
              maxWidth: '440px',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#f87171' }}>
              <ShieldAlert size={28} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0 }}>Eliminar Marca</h3>
            </div>

            {deleteError ? (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  fontSize: '0.85rem',
                }}
              >
                {deleteError}
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 1.25rem 0' }}>
                ¿Está seguro de que desea eliminar la marca <strong style={{ color: 'var(--primary)' }}>{deletingMarca.name}</strong>?
                {deletingMarca.vehiculosCount > 0 && (
                  <span style={{ display: 'block', marginTop: '0.5rem', color: '#f87171', fontWeight: '600' }}>
                    Atención: Esta marca tiene {deletingMarca.vehiculosCount} vehículo(s) asociado(s). Debe reasignarlos antes de poder eliminarla.
                  </span>
                )}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setDeletingMarca(null)}
                disabled={deleting}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmDelete}
                disabled={deleting || deletingMarca.vehiculosCount > 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: deletingMarca.vehiculosCount > 0 ? '#4b5563' : '#ef4444',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: deleting || deletingMarca.vehiculosCount > 0 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  opacity: deletingMarca.vehiculosCount > 0 ? 0.6 : 1,
                }}
              >
                {deleting ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Confirmar Eliminación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
