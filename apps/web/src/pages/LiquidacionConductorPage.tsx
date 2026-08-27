import React, { useState, useEffect } from 'react';
import {
  liquidacionService,
} from '../services/liquidacionService';
import {
  LiquidacionConductor,
  Tercero,
  CreateLiquidacionInput,
  UpdateLiquidacionInput,
} from '@maquitaxis/shared';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  User,
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
  FileText,
  Clock,
  Briefcase,
  Coins,
} from 'lucide-react';

export const LiquidacionConductorPage: React.FC = () => {
  const { tercero } = useAuth();
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionConductor[]>([]);
  const [drivers, setDrivers] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtros
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingLiquidacion, setEditingLiquidacion] = useState<LiquidacionConductor | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del Formulario
  const [formDriverId, setFormDriverId] = useState<string>('');
  const [formPaymentDate, setFormPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formFromDate, setFormFromDate] = useState<string>('');
  const [formToDate, setFormToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formDetail, setFormDetail] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('0');

  // Modal Eliminación
  const [deletingLiquidacion, setDeletingLiquidacion] = useState<LiquidacionConductor | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadLiquidaciones();
  }, [selectedDriverFilter, startDateFilter, endDateFilter]);

  const loadInitialData = async () => {
    try {
      const dList = await liquidacionService.fetchDrivers();
      setDrivers(dList);
      await loadLiquidaciones();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar datos iniciales.' });
      setLoading(false);
    }
  };

  const loadLiquidaciones = async () => {
    setLoading(true);
    try {
      const list = await liquidacionService.fetchLiquidaciones(
        selectedDriverFilter || undefined,
        startDateFilter || undefined,
        endDateFilter || undefined
      );
      setLiquidaciones(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar los registros de liquidación.' });
    } finally {
      setLoading(false);
    }
  };

  // Abrir Modal Crear
  const handleOpenCreateModal = () => {
    setEditingLiquidacion(null);
    const nowStr = new Date().toISOString().split('T')[0];
    setFormPaymentDate(nowStr);

    // Periodo sugerido hace 1 año hasta hoy
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    setFormFromDate(oneYearAgo.toISOString().split('T')[0]);
    setFormToDate(nowStr);

    setFormDetail('');
    setFormAmount('0');
    setFormError(null);

    let defaultDriverId = drivers.length > 0 ? drivers[0].id : '';
    if (tercero?.is_driver && tercero.id) {
      defaultDriverId = tercero.id;
    }
    setFormDriverId(defaultDriverId);

    setShowModal(true);
  };

  // Abrir Modal Editar
  const handleOpenEditModal = (l: LiquidacionConductor) => {
    setEditingLiquidacion(l);
    setFormDriverId(l.terceroId);
    setFormPaymentDate(l.paymentDate);
    setFormFromDate(l.fromDate);
    setFormToDate(l.toDate);
    setFormDetail(l.detail || '');
    setFormAmount(l.amount ? l.amount.toString() : '0');
    setFormError(null);
    setShowModal(true);
  };

  // Guardar Liquidación
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formDriverId) {
      setFormError('Por favor selecciona un conductor.');
      return;
    }
    if (!formPaymentDate) {
      setFormError('La fecha de pago es obligatoria.');
      return;
    }
    if (!formFromDate || !formToDate) {
      setFormError('Las fechas desde y hasta del periodo liquidados son obligatorias.');
      return;
    }
    if (!formDetail || formDetail.trim() === '') {
      setFormError('Por favor especifica el detalle o concepto de la liquidación.');
      return;
    }

    const amt = parseFloat(formAmount) || 0;
    if (amt < 0) {
      setFormError('El valor pagado de la liquidación no puede ser negativo.');
      return;
    }

    setSaving(true);
    try {
      if (editingLiquidacion) {
        const updateInput: UpdateLiquidacionInput = {
          terceroId: formDriverId,
          paymentDate: formPaymentDate,
          fromDate: formFromDate,
          toDate: formToDate,
          detail: formDetail.trim(),
          amount: amt,
        };
        await liquidacionService.updateLiquidacion(editingLiquidacion.id, updateInput);
        setFeedback({ type: 'success', message: 'Registro de liquidación del conductor actualizado con éxito.' });
      } else {
        const createInput: CreateLiquidacionInput = {
          terceroId: formDriverId,
          paymentDate: formPaymentDate,
          fromDate: formFromDate,
          toDate: formToDate,
          detail: formDetail.trim(),
          amount: amt,
        };
        await liquidacionService.createLiquidacion(createInput);
        setFeedback({ type: 'success', message: 'Liquidación de prestaciones sociales registrada exitosamente.' });
      }

      setShowModal(false);
      await loadLiquidaciones();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la liquidación.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Registro
  const handleDeleteLiquidacion = async () => {
    if (!deletingLiquidacion) return;
    setDeleting(true);
    try {
      await liquidacionService.deleteLiquidacion(deletingLiquidacion.id);
      setFeedback({ type: 'success', message: 'Registro de liquidación eliminado.' });
      setDeletingLiquidacion(null);
      await loadLiquidaciones();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'No se pudo eliminar el registro.' });
    } finally {
      setDeleting(false);
    }
  };

  // Función para calcular días en el rango (Desde -> Hasta)
  const calculateDaysInRange = (from: string, to: string) => {
    if (!from || !to) return 0;
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diffTime = d2.getTime() - d1.getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 3600 * 24)) + 1;
  };

  // Métricas Consolidadas
  const totalPagosLiquidacion = liquidaciones.reduce((acc, l) => acc + l.amount, 0);
  const uniqueDriversCount = new Set(liquidaciones.map((l) => l.terceroId)).size;

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
            <Receipt size={26} color="var(--primary)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Liquidación de Conductores (Prestaciones Sociales)
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
            Registro de los pagos de liquidación de prestaciones sociales, valor pagado y periodo laborado (desde - hasta).
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
          <span>Registrar Liquidación de Conductor</span>
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
        {/* Total Liquidaciones */}
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
              Liquidaciones Procesadas
            </span>
            <Briefcase color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {liquidaciones.length} liquidaciones
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Histórico de prestaciones
          </p>
        </div>

        {/* Valor Total Pagado */}
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
              TOTAL PAGADO EN LIQUIDACIONES
            </span>
            <Coins color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(totalPagosLiquidacion)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Suma de valores desembolsados
          </p>
        </div>

        {/* Conductores Liquidados */}
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
              Conductores Liquidados
            </span>
            <User color="#38bdf8" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.5rem', margin: 0 }}>
            {uniqueDriversCount} conductores
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            {drivers.length} registrados en sistema
          </p>
        </div>

        {/* Último Pago */}
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
              Última Fecha de Pago
            </span>
            <Calendar color="#a855f7" size={20} />
          </div>
          <p style={{ fontSize: '1.25rem', fontWeight: '800', color: '#a855f7', marginTop: '0.5rem', margin: 0 }}>
            {liquidaciones.length > 0 ? liquidaciones[0].paymentDate : '---'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Fecha de pago reciente
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

        {/* Filtro Conductor */}
        <select
          value={selectedDriverFilter}
          onChange={(e) => setSelectedDriverFilter(e.target.value)}
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
          <option value="">-- Todos los Conductores --</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} (Doc: {d.docNumber})
            </option>
          ))}
        </select>

        {/* Filtro Fecha Desde */}
        <input
          type="date"
          value={startDateFilter}
          onChange={(e) => setStartDateFilter(e.target.value)}
          style={{
            padding: '0.45rem 0.75rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
          title="Fecha Pago Desde"
        />

        {/* Filtro Fecha Hasta */}
        <input
          type="date"
          value={endDateFilter}
          onChange={(e) => setEndDateFilter(e.target.value)}
          style={{
            padding: '0.45rem 0.75rem',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            outline: 'none',
          }}
          title="Fecha Pago Hasta"
        />

        {(selectedDriverFilter || startDateFilter || endDateFilter) && (
          <button
            onClick={() => {
              setSelectedDriverFilter('');
              setStartDateFilter('');
              setEndDateFilter('');
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
          onClick={loadLiquidaciones}
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

      {/* Tabla de Liquidaciones */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Cargando registros de liquidaciones de conductores...</p>
        </div>
      ) : liquidaciones.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Receipt size={48} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No hay liquidaciones de conductores registradas
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Registra los pagos de prestaciones sociales y liquidaciones periódicas de los conductores.
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
            Registrar Liquidación Ahora
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
                  <th style={{ padding: '1rem 1.25rem' }}>Fecha de Pago</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Conductor</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Periodo Pagado (Desde - Hasta)</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Detalle de Liquidación</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Valor Total Pagado</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {liquidaciones.map((l) => {
                  const daysCount = calculateDaysInRange(l.fromDate, l.toDate);

                  return (
                    <tr
                      key={l.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} color="var(--primary)" />
                          {l.paymentDate}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        <div>{l.tercero?.name || 'Conductor no asignado'}</div>
                        {l.tercero?.docNumber && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                            Doc: {l.tercero.docNumber}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: '700', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={14} />
                          {l.fromDate} ➔ {l.toDate}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          ({daysCount} días laborados liquidados)
                        </div>
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
                          {l.detail}
                        </div>
                      </td>

                      {/* VALOR TOTAL PAGADO */}
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: '#34d399', fontSize: '1rem' }}>
                        {formatCurrency(l.amount)}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenEditModal(l)}
                            title="Editar Liquidación"
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
                            onClick={() => setDeletingLiquidacion(l)}
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

      {/* Modal Crear / Editar Liquidación */}
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
                <Receipt size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {editingLiquidacion ? 'Editar Liquidación del Conductor' : 'Registrar Liquidación del Conductor'}
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
                {/* Conductor */}
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
                    Conductor *
                  </label>
                  <select
                    required
                    value={formDriverId}
                    onChange={(e) => setFormDriverId(e.target.value)}
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
                    <option value="">-- Selecciona el Conductor --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Doc: {d.docNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha de Pago */}
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
                    Fecha cuando se Hizo el Pago *
                  </label>
                  <input
                    type="date"
                    required
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
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

                {/* Periodo Pagado (Desde - Hasta) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#38bdf8',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Periodo Pagado Desde *
                    </label>
                    <input
                      type="date"
                      required
                      value={formFromDate}
                      onChange={(e) => setFormFromDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-dark)',
                        border: '1px solid #38bdf8',
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
                        color: '#38bdf8',
                        marginBottom: '0.4rem',
                      }}
                    >
                      Periodo Pagado Hasta *
                    </label>
                    <input
                      type="date"
                      required
                      value={formToDate}
                      onChange={(e) => setFormToDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-dark)',
                        border: '1px solid #38bdf8',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Detalle Amplio de lo Pagado */}
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
                    Detalle / Conceptos de la Liquidación *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Registra detalladamente los conceptos liquidados (Cesantías, Intereses de Cesantías, Prima de Servicios, Vacaciones, Ahorro entregado, etc.)..."
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

                {/* Valor Pagado */}
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
                    Valor Pagado por Liquidación ($) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    placeholder="Ej: 1500000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
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
                  {saving ? 'Guardando...' : editingLiquidacion ? 'Guardar Cambios' : 'Guardar Liquidación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación */}
      {deletingLiquidacion && (
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
              ¿Eliminar registro de liquidación?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              ¿Estás seguro de eliminar el registro de liquidación del conductor{' '}
              <strong>{deletingLiquidacion.tercero?.name}</strong> realizado el {deletingLiquidacion.paymentDate}?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingLiquidacion(null)}
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
                onClick={handleDeleteLiquidacion}
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
