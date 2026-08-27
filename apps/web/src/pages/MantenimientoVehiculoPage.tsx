import React, { useState, useEffect } from 'react';
import {
  mantenimientoService,
} from '../services/mantenimientoService';
import {
  MantenimientoTaller,
  Tercero,
  Vehiculo,
  CreateMantenimientoInput,
  UpdateMantenimientoInput,
} from '@maquitaxis/shared';
import { useAuth } from '../context/AuthContext';
import {
  Wrench,
  Car,
  Calendar,
  DollarSign,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  FileText,
  Gauge,
  Phone,
  Info,
} from 'lucide-react';

export const MantenimientoVehiculoPage: React.FC = () => {
  const { tercero } = useAuth();
  const [mantenimientos, setMantenimientos] = useState<MantenimientoTaller[]>([]);
  const [suppliers, setSuppliers] = useState<Tercero[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtros
  const [selectedVehiculoFilter, setSelectedVehiculoFilter] = useState<string>('');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('');

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingMantenimiento, setEditingMantenimiento] = useState<MantenimientoTaller | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del Formulario
  const [formVehiculoId, setFormVehiculoId] = useState<string>('');
  const [formSupplierId, setFormSupplierId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formCurrentMileage, setFormCurrentMileage] = useState<string>('0');
  const [formDetail, setFormDetail] = useState<string>('');
  const [formTotalValue, setFormTotalValue] = useState<string>('0');

  // Modal Eliminación
  const [deletingMantenimiento, setDeletingMantenimiento] = useState<MantenimientoTaller | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadMantenimientos();
  }, [selectedVehiculoFilter, selectedSupplierFilter]);

  const loadInitialData = async () => {
    try {
      const [sList, vList] = await Promise.all([
        mantenimientoService.fetchSuppliers(),
        mantenimientoService.fetchVehiculos(),
      ]);
      setSuppliers(sList);
      setVehiculos(vList);
      await loadMantenimientos();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar datos iniciales.' });
      setLoading(false);
    }
  };

  const loadMantenimientos = async () => {
    setLoading(true);
    try {
      const list = await mantenimientoService.fetchMantenimientos(
        selectedVehiculoFilter || undefined,
        selectedSupplierFilter || undefined
      );
      setMantenimientos(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar mantenimientos del vehículo.' });
    } finally {
      setLoading(false);
    }
  };

  // Abrir Modal Crear
  const handleOpenCreateModal = () => {
    setEditingMantenimiento(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDetail('');
    setFormTotalValue('0');
    setFormCurrentMileage('0');
    setFormError(null);

    let defaultVehiculoId = vehiculos.length > 0 ? vehiculos[0].id : '';
    if (tercero?.id) {
      const assigned = vehiculos.find((v) => v.driverId === tercero.id);
      if (assigned) defaultVehiculoId = assigned.id;
    }
    setFormVehiculoId(defaultVehiculoId);

    const defaultSupplierId = suppliers.length > 0 ? suppliers[0].id : '';
    setFormSupplierId(defaultSupplierId);

    setShowModal(true);
  };

  // Abrir Modal Editar
  const handleOpenEditModal = (m: MantenimientoTaller) => {
    setEditingMantenimiento(m);
    setFormVehiculoId(m.vehiculoId);
    setFormSupplierId(m.supplierId);
    setFormDate(m.date);
    setFormCurrentMileage(m.currentMileage ? m.currentMileage.toString() : '0');
    setFormDetail(m.detail || '');
    setFormTotalValue(m.totalValue ? m.totalValue.toString() : '0');
    setFormError(null);
    setShowModal(true);
  };

  // Guardar Mantenimiento
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formVehiculoId) {
      setFormError('Por favor selecciona un vehículo/taxi.');
      return;
    }
    if (!formSupplierId) {
      setFormError('Por favor selecciona un taller o proveedor.');
      return;
    }
    if (!formDate) {
      setFormError('La fecha del mantenimiento es obligatoria.');
      return;
    }
    if (!formDetail || formDetail.trim() === '') {
      setFormError('Por favor registra el detalle de los trabajos realizados en el taller.');
      return;
    }

    const totalVal = parseFloat(formTotalValue) || 0;
    const currentKm = parseInt(formCurrentMileage, 10) || 0;

    if (totalVal < 0) {
      setFormError('El valor total del mantenimiento no puede ser negativo.');
      return;
    }

    setSaving(true);
    try {
      if (editingMantenimiento) {
        const updateInput: UpdateMantenimientoInput = {
          vehiculoId: formVehiculoId,
          supplierId: formSupplierId,
          date: formDate,
          currentMileage: currentKm,
          detail: formDetail.trim(),
          totalValue: totalVal,
        };
        await mantenimientoService.updateMantenimiento(editingMantenimiento.id, updateInput);
        setFeedback({ type: 'success', message: 'Registro de mantenimiento de taller actualizado exitosamente.' });
      } else {
        const createInput: CreateMantenimientoInput = {
          vehiculoId: formVehiculoId,
          supplierId: formSupplierId,
          date: formDate,
          currentMileage: currentKm,
          detail: formDetail.trim(),
          totalValue: totalVal,
        };
        await mantenimientoService.createMantenimiento(createInput);
        setFeedback({ type: 'success', message: 'Mantenimiento en taller registrado con éxito.' });
      }

      setShowModal(false);
      await loadMantenimientos();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el mantenimiento.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Registro
  const handleDeleteMantenimiento = async () => {
    if (!deletingMantenimiento) return;
    setDeleting(true);
    try {
      await mantenimientoService.deleteMantenimiento(deletingMantenimiento.id);
      setFeedback({ type: 'success', message: 'Registro de mantenimiento eliminado.' });
      setDeletingMantenimiento(null);
      await loadMantenimientos();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'No se pudo eliminar el registro.' });
    } finally {
      setDeleting(false);
    }
  };

  // Métricas Consolidadas
  const totalInversion = mantenimientos.reduce((acc, m) => acc + m.totalValue, 0);
  const uniqueSuppliersCount = new Set(mantenimientos.map((m) => m.supplierId)).size;
  const uniqueVehiculosCount = new Set(mantenimientos.map((m) => m.vehiculoId)).size;

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%', height: '100%', overflowY: 'auto', background: 'var(--bg-dark)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wrench size={26} color="var(--primary)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Mantenimiento al Vehículo (Talleres y Proveedores)
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
            Registro de mantenimientos generales, repuestos e imprevistos realizados en talleres (distintos a eventos fijos).
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: 'var(--primary)',
            border: 'none',
            borderRadius: '8px',
            color: 'var(--bg-dark)',
            fontWeight: '800',
            cursor: 'pointer',
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
          }}
        >
          <Plus size={18} />
          <span>Registrar Mantenimiento en Taller</span>
        </button>
      </div>

      {/* Alerta Feedback */}
      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
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

      {/* Tarjetas KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Total Intervenciones */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Mantenimientos en Taller
            </span>
            <Wrench color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {mantenimientos.length} trabajos
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Reparaciones e imprevistos
          </p>
        </div>

        {/* Inversión Total */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--primary)',
            backgroundColor: 'rgba(245, 158, 11, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>
              INVERSIÓN TOTAL TALLERES
            </span>
            <DollarSign color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(totalInversion)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Gasto acumulado en talleres
          </p>
        </div>

        {/* Talleres y Proveedores Distintos */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Talleres / Proveedores
            </span>
            <Building2 color="#38bdf8" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.5rem', margin: 0 }}>
            {uniqueSuppliersCount} proveedores
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            {suppliers.length} talleres en sistema
          </p>
        </div>

        {/* Taxis Intervenidos */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Vehículos Atendidos
            </span>
            <Car color="#a855f7" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#a855f7', marginTop: '0.5rem', margin: 0 }}>
            {uniqueVehiculosCount} taxis
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Con registro de taller
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <SlidersHorizontal size={16} />
          <span style={{ fontWeight: '600' }}>Filtros:</span>
        </div>

        {/* Filtro Taxi */}
        <select
          value={selectedVehiculoFilter}
          onChange={(e) => setSelectedVehiculoFilter(e.target.value)}
          style={{
            padding: '0.5rem 0.85rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        >
          <option value="">-- Todos los Taxis --</option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>
              Taxi {v.plate} {v.driver ? `(${v.driver.name})` : ''}
            </option>
          ))}
        </select>

        {/* Filtro Taller / Proveedor */}
        <select
          value={selectedSupplierFilter}
          onChange={(e) => setSelectedSupplierFilter(e.target.value)}
          style={{
            padding: '0.5rem 0.85rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        >
          <option value="">-- Todos los Talleres / Proveedores --</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (NIT/Doc: {s.docNumber})
            </option>
          ))}
        </select>

        {(selectedVehiculoFilter || selectedSupplierFilter) && (
          <button
            onClick={() => {
              setSelectedVehiculoFilter('');
              setSelectedSupplierFilter('');
            }}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Limpiar Filtros
          </button>
        )}

        <button
          onClick={loadMantenimientos}
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* Tabla de Registros de Mantenimiento */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Cargando registros de mantenimientos en taller...</p>
        </div>
      ) : mantenimientos.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Wrench size={48} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No hay mantenimientos de taller registrados
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Registra los trabajos realizados en talleres, compra de repuestos o imprevistos de los taxis.
          </p>
          <button
            onClick={handleOpenCreateModal}
            style={{
              padding: '0.65rem 1.25rem',
              backgroundColor: 'var(--primary)',
              border: 'none',
              color: 'var(--bg-dark)',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            Registrar Mantenimiento Ahora
          </button>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '1rem 1.25rem' }}>Fecha</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Taxi / Vehículo</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Taller / Proveedor</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Detalle de lo Realizado</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Kilometraje (Km)</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Valor Total Mantenimiento</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mantenimientos.map((m) => (
                  <tr
                    key={m.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={14} color="var(--primary)" />
                        {m.date}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Car size={15} />
                        Taxi {m.vehiculo?.plate || '---'}
                      </span>
                      {m.vehiculo?.driver && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          Conductor: {m.vehiculo.driver.name}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: '700', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Building2 size={14} />
                        {m.supplier?.name || 'Proveedor no asignado'}
                      </div>
                      {m.supplier?.docNumber && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Doc/NIT: {m.supplier.docNumber}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', maxWidth: '320px' }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.4',
                        }}
                      >
                        {m.detail}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Gauge size={14} color="#fbbf24" />
                        {m.currentMileage ? `${m.currentMileage.toLocaleString()} km` : '0 km'}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: '#34d399', fontSize: '0.95rem' }}>
                      {formatCurrency(m.totalValue)}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          title="Editar Mantenimiento"
                          style={{
                            padding: '0.4rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingMantenimiento(m)}
                          title="Eliminar Registro"
                          style={{
                            padding: '0.4rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Mantenimiento */}
      {showModal && (
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
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '580px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header Modal */}
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
                <Wrench size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {editingMantenimiento ? 'Editar Mantenimiento en Taller' : 'Registrar Mantenimiento al Vehículo'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {formError && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    fontSize: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Vehículo / Taxi */}
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
                    Vehículo / Taxi *
                  </label>
                  <select
                    required
                    value={formVehiculoId}
                    onChange={(e) => setFormVehiculoId(e.target.value)}
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
                  >
                    <option value="">-- Selecciona el Taxi --</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        Taxi {v.plate} {v.driver ? `(Conductor: ${v.driver.name})` : '(Sin conductor)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proveedor / Taller */}
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
                    Taller / Proveedor del Servicio *
                  </label>
                  {suppliers.length === 0 ? (
                    <div
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid #f59e0b',
                        color: '#fbbf24',
                        fontSize: '0.825rem',
                      }}
                    >
                      ⚠️ No se encontraron terceros registrados como Proveedores (is_supplier = true). Por favor ve a la pestaña <strong>Terceros</strong> y activa la casilla <strong>"Es Proveedor / Taller"</strong> en el tercero correspondiente.
                    </div>
                  ) : (
                    <select
                      required
                      value={formSupplierId}
                      onChange={(e) => setFormSupplierId(e.target.value)}
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
                    >
                      <option value="">-- Selecciona el Taller / Proveedor --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (NIT/Doc: {s.docNumber})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Fecha y Kilometraje */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                      Fecha del Mantenimiento *
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
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
                        color: '#fbbf24',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Kilometraje al Cambiar (Km) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="Ej: 145000"
                      value={formCurrentMileage}
                      onChange={(e) => setFormCurrentMileage(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-dark)',
                        border: '1px solid #f59e0b',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Detalle Amplio de lo Realizado */}
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
                    Detalle del Mantenimiento / Reparación *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Registra detalladamente los repuestos cambiados, arreglos o mantenimientos ejecutados en el taller..."
                    value={formDetail}
                    onChange={(e) => setFormDetail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Valor Total del Mantenimiento */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#34d399',
                      marginBottom: '0.4rem',
                    }}
                  >
                    Valor Total del Mantenimiento ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    placeholder="Ej: 350000"
                    value={formTotalValue}
                    onChange={(e) => setFormTotalValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-dark)',
                      border: '1px solid #10b981',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontWeight: '700',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Footer Buttons */}
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
                  onClick={() => setShowModal(false)}
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
                  disabled={saving || suppliers.length === 0}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    backgroundColor: 'var(--primary)',
                    border: 'none',
                    color: 'var(--bg-dark)',
                    fontWeight: '700',
                    cursor: saving ? 'wait' : 'pointer',
                  }}
                >
                  {saving ? 'Guardando...' : editingMantenimiento ? 'Guardar Cambios' : 'Guardar Mantenimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación */}
      {deletingMantenimiento && (
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
            zIndex: 1000,
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
              padding: '1.5rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              ¿Eliminar registro de mantenimiento?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              ¿Estás seguro de eliminar el registro de mantenimiento del Taxi{' '}
              <strong>{deletingMantenimiento.vehiculo?.plate}</strong> en el taller{' '}
              <strong>{deletingMantenimiento.supplier?.name}</strong> realizado el {deletingMantenimiento.date}?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingMantenimiento(null)}
                style={{
                  padding: '0.6rem 1.25rem',
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
                onClick={handleDeleteMantenimiento}
                disabled={deleting}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: deleting ? 'wait' : 'pointer',
                }}
              >
                {deleting ? 'Eliminando...' : 'Sí, Eliminar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
