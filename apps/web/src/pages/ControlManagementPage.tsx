import React, { useState, useEffect } from 'react';
import {
  controlService,
} from '../services/controlService';
import {
  ControlEvento,
  EventoCatalogo,
  Vehiculo,
  CreateControlInput,
  UpdateControlInput,
} from '@maquitaxis/shared';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardList,
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
  Info,
  Clock,
  Gauge,
  Calculator,
  ShieldAlert,
} from 'lucide-react';

export const ControlManagementPage: React.FC = () => {
  const { tercero } = useAuth();
  const [controles, setControles] = useState<ControlEvento[]>([]);
  const [eventos, setEventos] = useState<EventoCatalogo[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtros
  const [selectedVehiculoFilter, setSelectedVehiculoFilter] = useState<string>('');
  const [selectedEventoFilter, setSelectedEventoFilter] = useState<string>('');

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingControl, setEditingControl] = useState<ControlEvento | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del Formulario
  const [formVehiculoId, setFormVehiculoId] = useState<string>('');
  const [formEventoId, setFormEventoId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formUnitValue, setFormUnitValue] = useState<string>('0');
  const [formQuantity, setFormQuantity] = useState<string>('1');
  const [formCurrentMileage, setFormCurrentMileage] = useState<string>('0');

  // Campos calculados automáticamente
  const [calculatedNextMileage, setCalculatedNextMileage] = useState<number | undefined>(undefined);
  const [calculatedNextDate, setCalculatedNextDate] = useState<string | undefined>(undefined);

  // Modal Eliminación
  const [deletingControl, setDeletingControl] = useState<ControlEvento | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadControles();
  }, [selectedVehiculoFilter, selectedEventoFilter]);

  // Recalcular Próximo Cambio en Vivo al modificar Evento, Fecha o Kilometraje
  useEffect(() => {
    recalculateNextChanges();
  }, [formEventoId, formDate, formCurrentMileage]);

  const loadInitialData = async () => {
    try {
      const [eList, vList] = await Promise.all([
        controlService.fetchEventosForControl(),
        controlService.fetchVehiculosForControl(),
      ]);
      setEventos(eList);
      setVehiculos(vList);
      await loadControles();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar los datos iniciales.' });
      setLoading(false);
    }
  };

  const loadControles = async () => {
    setLoading(true);
    try {
      const list = await controlService.fetchControles(
        selectedVehiculoFilter || undefined,
        selectedEventoFilter || undefined
      );
      setControles(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar controles de mantenimiento.' });
    } finally {
      setLoading(false);
    }
  };

  // Función para recalcular Próximo Cambio (Km y/o Fecha) de acuerdo al evento seleccionado
  const recalculateNextChanges = () => {
    if (!formEventoId) {
      setCalculatedNextMileage(undefined);
      setCalculatedNextDate(undefined);
      return;
    }

    const targetEvento = eventos.find((e) => e.id === formEventoId);
    if (!targetEvento) return;

    const currentKm = parseInt(formCurrentMileage, 10) || 0;
    const appliesBy = targetEvento.appliesBy || 'kilometros';

    // 1. Cálculo por Kilómetros
    if (appliesBy === 'kilometros' || appliesBy === 'kilometros_y_meses') {
      const nextKm = currentKm + (targetEvento.kmsInterval || 0);
      setCalculatedNextMileage(nextKm);
    } else {
      setCalculatedNextMileage(undefined);
    }

    // 2. Cálculo por Meses
    if (appliesBy === 'meses' || appliesBy === 'kilometros_y_meses') {
      if (formDate && targetEvento.monthsInterval && targetEvento.monthsInterval > 0) {
        const baseDate = new Date(formDate);
        baseDate.setMonth(baseDate.getMonth() + targetEvento.monthsInterval);
        const yyyy = baseDate.getFullYear();
        const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
        const dd = String(baseDate.getDate()).padStart(2, '0');
        setCalculatedNextDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setCalculatedNextDate(undefined);
      }
    } else {
      setCalculatedNextDate(undefined);
    }
  };

  // Manejador al seleccionar un Evento en el Formulario
  const handleEventoChangeInForm = (eventoId: string) => {
    setFormEventoId(eventoId);
    const targetEvento = eventos.find((e) => e.id === eventoId);
    if (targetEvento) {
      // Auto-llenar el valor sugerido de la tabla eventos
      setFormUnitValue(targetEvento.estimatedValue ? targetEvento.estimatedValue.toString() : '0');
    }
  };

  // Abrir Modal Crear
  const handleOpenCreateModal = () => {
    setEditingControl(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormQuantity('1');
    setFormError(null);

    let defaultVehiculoId = vehiculos.length > 0 ? vehiculos[0].id : '';
    if (tercero?.id) {
      const assigned = vehiculos.find((v) => v.driverId === tercero.id);
      if (assigned) defaultVehiculoId = assigned.id;
    }
    setFormVehiculoId(defaultVehiculoId);

    const defaultEventoId = eventos.length > 0 ? eventos[0].id : '';
    setFormEventoId(defaultEventoId);
    if (defaultEventoId) {
      const target = eventos.find((e) => e.id === defaultEventoId);
      setFormUnitValue(target?.estimatedValue ? target.estimatedValue.toString() : '0');
    } else {
      setFormUnitValue('0');
    }

    setFormCurrentMileage('0');
    setShowModal(true);
  };

  // Abrir Modal Editar
  const handleOpenEditModal = (c: ControlEvento) => {
    setEditingControl(c);
    setFormVehiculoId(c.vehiculoId);
    setFormEventoId(c.eventoId);
    setFormDate(c.date);
    setFormUnitValue(c.unitValue ? c.unitValue.toString() : '0');
    setFormQuantity(c.quantity ? c.quantity.toString() : '1');
    setFormCurrentMileage(c.currentMileage ? c.currentMileage.toString() : '0');
    setFormError(null);
    setShowModal(true);
  };

  // Guardar Mantenimiento de Control
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formVehiculoId) {
      setFormError('Por favor selecciona un vehículo/taxi.');
      return;
    }
    if (!formEventoId) {
      setFormError('Por favor selecciona el evento de mantenimiento.');
      return;
    }
    if (!formDate) {
      setFormError('La fecha del mantenimiento es obligatoria.');
      return;
    }

    const unitVal = parseFloat(formUnitValue) || 0;
    const qty = parseInt(formQuantity, 10) || 1;
    const currentKm = parseInt(formCurrentMileage, 10) || 0;
    const totalVal = unitVal * qty;

    if (unitVal < 0) {
      setFormError('El valor unitario no puede ser negativo.');
      return;
    }
    if (qty <= 0) {
      setFormError('La cantidad debe ser mayor a cero.');
      return;
    }

    setSaving(true);
    try {
      if (editingControl) {
        const updateInput: UpdateControlInput = {
          vehiculoId: formVehiculoId,
          eventoId: formEventoId,
          date: formDate,
          unitValue: unitVal,
          quantity: qty,
          totalValue: totalVal,
          currentMileage: currentKm,
          nextChangeMileage: calculatedNextMileage,
          nextChangeDate: calculatedNextDate,
        };
        await controlService.updateControl(editingControl.id, updateInput);
        setFeedback({ type: 'success', message: 'Registro de mantenimiento de control actualizado exitosamente.' });
      } else {
        const createInput: CreateControlInput = {
          vehiculoId: formVehiculoId,
          eventoId: formEventoId,
          date: formDate,
          unitValue: unitVal,
          quantity: qty,
          totalValue: totalVal,
          currentMileage: currentKm,
          nextChangeMileage: calculatedNextMileage,
          nextChangeDate: calculatedNextDate,
        };
        await controlService.createControl(createInput);
        setFeedback({
          type: 'success',
          message: 'Mantenimiento registrado con éxito. Se actualizó el valor sugerido en el catálogo de eventos.',
        });
      }

      setShowModal(false);
      await loadControles();
      // Refrescar catálogo de eventos por si cambió el estimated_value
      const refreshedEventos = await controlService.fetchEventosForControl();
      setEventos(refreshedEventos);
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el registro de control.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Registro
  const handleDeleteControl = async () => {
    if (!deletingControl) return;
    setDeleting(true);
    try {
      await controlService.deleteControl(deletingControl.id);
      setFeedback({ type: 'success', message: 'Registro de mantenimiento eliminado.' });
      setDeletingControl(null);
      await loadControles();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'No se pudo eliminar el registro.' });
    } finally {
      setDeleting(false);
    }
  };

  // Valores calculados en vivo para el formulario
  const unitValNum = parseFloat(formUnitValue) || 0;
  const qtyNum = parseInt(formQuantity, 10) || 1;
  const totalValNum = unitValNum * qtyNum;

  // Métricas Consolidadas
  const totalInversion = controles.reduce((acc, c) => acc + c.totalValue, 0);

  const selectedTargetEvento = eventos.find((e) => e.id === formEventoId);

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
            <ClipboardList size={26} color="var(--primary)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Control de Eventos y Mantenimientos Preventivos
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
            Registro de ejecuciones de mantenimientos (cambio de aceite, llantas, SOAT, etc.) y programación de próximos cambios.
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
          <span>Registrar Mantenimiento / Evento</span>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Total Registros */}
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
              Mantenimientos Ejecutados
            </span>
            <Wrench color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {controles.length} intervenciones
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Eventos preventivos registrados
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
              INVERSIÓN TOTAL MANTENIMIENTO
            </span>
            <DollarSign color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(totalInversion)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Suma total (Valor x Cantidad)
          </p>
        </div>

        {/* Catálogo de Eventos Disponibles */}
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
              Eventos en Catálogo
            </span>
            <ClipboardList color="#38bdf8" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.5rem', margin: 0 }}>
            {eventos.length} tipos de eventos
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Frecuencia por Km y/o Meses
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

        {/* Filtro Evento */}
        <select
          value={selectedEventoFilter}
          onChange={(e) => setSelectedEventoFilter(e.target.value)}
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
          <option value="">-- Todos los Eventos --</option>
          {eventos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        {(selectedVehiculoFilter || selectedEventoFilter) && (
          <button
            onClick={() => {
              setSelectedVehiculoFilter('');
              setSelectedEventoFilter('');
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
          onClick={loadControles}
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

      {/* Tabla de Registros de Control */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Cargando registros de mantenimiento preventivo...</p>
        </div>
      ) : controles.length === 0 ? (
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
            No hay mantenimientos de control registrados
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Registra cuando le realices cambio de aceite, llantas o revisiones preventivas a un taxi.
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
                  <th style={{ padding: '1rem 1.25rem' }}>Fecha Evento</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Taxi / Vehículo</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Evento Realizado</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Valor Unitario x Cantidad</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Valor Total Control</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Km Cambio</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Próximo Cambio Programado</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {controles.map((c) => {
                  const appliesBy = c.evento?.appliesBy || 'kilometros';

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} color="var(--primary)" />
                          {c.date}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Car size={15} />
                          Taxi {c.vehiculo?.plate || '---'}
                        </span>
                        {c.vehiculo?.driver && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                            Conductor: {c.vehiculo.driver.name}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {c.evento?.name || 'Evento Desconocido'}
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            color: '#38bdf8',
                            backgroundColor: 'rgba(56, 189, 248, 0.12)',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            display: 'inline-block',
                            marginTop: '0.2rem',
                          }}
                        >
                          {appliesBy === 'kilometros' && '📏 Por Kilómetros'}
                          {appliesBy === 'meses' && '📅 Por Meses'}
                          {appliesBy === 'kilometros_y_meses' && '🔄 Km + Meses'}
                          {appliesBy === 'ninguno' && '⚪ Ninguno'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                        {formatCurrency(c.unitValue)} x {c.quantity} un
                      </td>

                      {/* VALOR TOTAL DEL CONTROL */}
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: '#34d399', fontSize: '0.95rem' }}>
                        {formatCurrency(c.totalValue)}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                        {c.currentMileage ? `${c.currentMileage.toLocaleString()} km` : '0 km'}
                      </td>

                      {/* PRÓXIMO CAMBIO */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {(appliesBy === 'kilometros' || appliesBy === 'kilometros_y_meses') && c.nextChangeMileage ? (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                color: '#fbbf24',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Gauge size={13} />
                              {c.nextChangeMileage.toLocaleString()} km
                            </span>
                          ) : null}

                          {(appliesBy === 'meses' || appliesBy === 'kilometros_y_meses') && c.nextChangeDate ? (
                            <span
                              style={{
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                color: '#38bdf8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Clock size={13} />
                              {c.nextChangeDate}
                            </span>
                          ) : null}

                          {appliesBy === 'ninguno' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sin programación</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenEditModal(c)}
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
                            onClick={() => setDeletingControl(c)}
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
                  );
                })}
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
              maxWidth: '600px',
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
                  {editingControl ? 'Editar Mantenimiento de Control' : 'Registrar Mantenimiento de Control'}
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

                {/* Evento de Mantenimiento */}
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
                    Evento de Mantenimiento *
                  </label>
                  <select
                    required
                    value={formEventoId}
                    onChange={(e) => handleEventoChangeInForm(e.target.value)}
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
                    <option value="">-- Selecciona el Evento (ej. Cambio de Aceite) --</option>
                    {eventos.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} (Valor Sugerido: {formatCurrency(e.estimatedValue)})
                      </option>
                    ))}
                  </select>
                  {selectedTargetEvento && (
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.3rem', display: 'block' }}>
                      ℹ️ Criterio de este evento: <strong>{selectedTargetEvento.appliesBy?.toUpperCase()}</strong>
                      {(selectedTargetEvento.kmsInterval || 0) > 0 ? ` | Cada ${(selectedTargetEvento.kmsInterval || 0).toLocaleString()} km` : ''}
                      {(selectedTargetEvento.monthsInterval || 0) > 0 ? ` | Cada ${selectedTargetEvento.monthsInterval} meses` : ''}
                    </span>
                  )}
                </div>

                {/* Fecha del Mantenimiento y Kilometraje Actual */}
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
                        color: 'var(--text-secondary)',
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
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Valor Unitario y Cantidad */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                      Valor Unitario ($) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="100"
                      placeholder="Sugerido de eventos"
                      value={formUnitValue}
                      onChange={(e) => setFormUnitValue(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-dark)',
                        border: '1px solid #10b981',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                      Se actualizará como nuevo valor sugerido en el catálogo de eventos.
                    </span>
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
                      Cantidad *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Ej: 1"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
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

                {/* CÁLCULO EN VIVO DEL VALOR TOTAL DEL CONTROL */}
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '10px',
                    border: '1px solid #10b981',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Operación:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {formatCurrency(unitValNum)} x {qtyNum} unidad(es)
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '1.1rem',
                      fontWeight: '800',
                      paddingTop: '0.4rem',
                      borderTop: '1px dashed rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calculator size={18} /> VALOR TOTAL DEL CONTROL:
                    </span>
                    <span style={{ color: '#34d399' }}>{formatCurrency(totalValNum)}</span>
                  </div>
                </div>

                {/* CÁLCULO EN VIVO DE PRÓXIMO CAMBIO (PROGRAMACIÓN) */}
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#38bdf8' }}>
                    📅 Programación de Próximo Cambio (Calculada según evento):
                  </span>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem' }}>
                    {calculatedNextMileage !== undefined ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24', fontWeight: '700' }}>
                        <Gauge size={16} /> Próximo Km: {calculatedNextMileage.toLocaleString()} km
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No aplica por Km</div>
                    )}

                    {calculatedNextDate !== undefined ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontWeight: '700' }}>
                        <Clock size={16} /> Próxima Fecha: {calculatedNextDate}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No aplica por Meses</div>
                    )}
                  </div>
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
                  disabled={saving}
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
                  {saving ? 'Guardando...' : editingControl ? 'Guardar Cambios' : 'Guardar Mantenimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación */}
      {deletingControl && (
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
              ¿Eliminar registro de control?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              ¿Estás seguro de eliminar el registro de <strong>{deletingControl.evento?.name}</strong> del Taxi{' '}
              <strong>{deletingControl.vehiculo?.plate}</strong> realizado el {deletingControl.date}?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingControl(null)}
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
                onClick={handleDeleteControl}
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
