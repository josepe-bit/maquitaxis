import React, { useState, useEffect } from 'react';
import {
  ssocialService,
} from '../services/ssocialService';
import {
  SeguridadSocial,
  Tercero,
  Mes,
  EventoCatalogo,
  CreateSeguridadSocialInput,
  UpdateSeguridadSocialInput,
} from '@maquitaxis/shared';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
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
  Calculator,
  Info,
  Clock,
} from 'lucide-react';

export const SSocialManagementPage: React.FC = () => {
  const { tercero } = useAuth();
  const [ssocialRecords, setSsocialRecords] = useState<SeguridadSocial[]>([]);
  const [drivers, setDrivers] = useState<Tercero[]>([]);
  const [meses, setMeses] = useState<Mes[]>([]);
  const [ssEvento, setSsEvento] = useState<EventoCatalogo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtros
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [selectedMesFilter, setSelectedMesFilter] = useState<string>('');

  // Modal Crear / Editar
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<SeguridadSocial | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del Formulario
  const [formDriverId, setFormDriverId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formMonthValue, setFormMonthValue] = useState<string>('500000');
  const [formDaysPaid, setFormDaysPaid] = useState<string>('30');
  const [formMesId, setFormMesId] = useState<number>(new Date().getMonth() + 1); // Mes actual (1-12)

  // Modal Eliminación
  const [deletingRecord, setDeletingRecord] = useState<SeguridadSocial | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadSSocialRecords();
  }, [selectedDriverFilter, selectedMesFilter]);

  const loadInitialData = async () => {
    try {
      const [dList, mList, evento] = await Promise.all([
        ssocialService.fetchDrivers(),
        ssocialService.fetchMeses(),
        ssocialService.fetchOrCreateSSEvento(),
      ]);
      setDrivers(dList);
      setMeses(mList);
      setSsEvento(evento);
      if (evento && (evento.estimatedValue || 0) > 0) {
        setFormMonthValue((evento.estimatedValue || 500000).toString());
      }
      await loadSSocialRecords();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar los datos iniciales.' });
      setLoading(false);
    }
  };

  const loadSSocialRecords = async () => {
    setLoading(true);
    try {
      const mesFilterId = selectedMesFilter ? parseInt(selectedMesFilter, 10) : undefined;
      const list = await ssocialService.fetchSSocialRecords(
        selectedDriverFilter || undefined,
        mesFilterId
      );
      setSsocialRecords(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar los registros de Seguridad Social.' });
    } finally {
      setLoading(false);
    }
  };

  // Abrir Modal Crear
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDaysPaid('30');
    setFormMesId(new Date().getMonth() + 1);
    setFormError(null);

    let defaultDriverId = drivers.length > 0 ? drivers[0].id : '';
    if (tercero?.is_driver && tercero.id) {
      defaultDriverId = tercero.id;
    }
    setFormDriverId(defaultDriverId);

    if (ssEvento && (ssEvento.estimatedValue || 0) > 0) {
      setFormMonthValue((ssEvento.estimatedValue || 500000).toString());
    } else {
      setFormMonthValue('500000');
    }

    setShowModal(true);
  };

  // Abrir Modal Editar
  const handleOpenEditModal = (s: SeguridadSocial) => {
    setEditingRecord(s);
    setFormDriverId(s.terceroId);
    setFormDate(s.date);
    setFormMonthValue(s.monthValue ? s.monthValue.toString() : '500000');
    setFormDaysPaid(s.daysPaid ? s.daysPaid.toString() : '30');
    setFormMesId(s.mesId);
    setFormError(null);
    setShowModal(true);
  };

  // Guardar Pago de Seguridad Social
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formDriverId) {
      setFormError('Por favor selecciona un conductor.');
      return;
    }
    if (!formDate) {
      setFormError('La fecha de pago es obligatoria.');
      return;
    }
    if (!formMesId) {
      setFormError('Por favor selecciona el mes que se está pagando.');
      return;
    }

    const monthVal = parseFloat(formMonthValue) || 0;
    const days = parseInt(formDaysPaid, 10) || 30;

    if (monthVal < 0) {
      setFormError('El valor del mes no puede ser negativo.');
      return;
    }
    if (days <= 0 || days > 31) {
      setFormError('Los días pagados deben estar entre 1 y 31 días.');
      return;
    }

    const computedPayment = (monthVal / 30) * days;

    setSaving(true);
    try {
      if (editingRecord) {
        const updateInput: UpdateSeguridadSocialInput = {
          terceroId: formDriverId,
          date: formDate,
          eventoId: ssEvento?.id,
          monthValue: monthVal,
          daysPaid: days,
          paymentAmount: computedPayment,
          mesId: formMesId,
        };
        await ssocialService.updateSSocial(editingRecord.id, updateInput);
        setFeedback({ type: 'success', message: 'Registro de pago de Seguridad Social actualizado correctamente.' });
      } else {
        const createInput: CreateSeguridadSocialInput = {
          terceroId: formDriverId,
          date: formDate,
          eventoId: ssEvento?.id,
          monthValue: monthVal,
          daysPaid: days,
          paymentAmount: computedPayment,
          mesId: formMesId,
        };
        await ssocialService.createSSocial(createInput);
        setFeedback({ type: 'success', message: 'Pago de Seguridad Social registrado con éxito.' });
      }

      setShowModal(false);
      await loadSSocialRecords();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el pago de Seguridad Social.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar Registro
  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;
    setDeleting(true);
    try {
      await ssocialService.deleteSSocial(deletingRecord.id);
      setFeedback({ type: 'success', message: 'Registro de Seguridad Social eliminado.' });
      setDeletingRecord(null);
      await loadSSocialRecords();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'No se pudo eliminar el registro.' });
    } finally {
      setDeleting(false);
    }
  };

  // Cálculo en tiempo real en vivo para el formulario
  const monthValNum = parseFloat(formMonthValue) || 0;
  const daysPaidNum = parseInt(formDaysPaid, 10) || 30;
  const computedFormPayment = (monthValNum / 30) * daysPaidNum;

  // Métricas Consolidadas
  const totalPagoAcumulado = ssocialRecords.reduce((acc, s) => acc + s.paymentAmount, 0);
  const uniqueDriversCount = new Set(ssocialRecords.map((s) => s.terceroId)).size;

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
            <ShieldCheck size={26} color="var(--primary)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Seguridad Social de Conductores
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
            Registro de los pagos por concepto de seguridad social de los conductores según los días laborados del mes.
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
          <span>Registrar Pago Seguridad Social</span>
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
        {/* Total Pagos Registrados */}
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
              Pagos Registrados
            </span>
            <ShieldCheck color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {ssocialRecords.length} pagos
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Histórico acumulado
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
              TOTAL RECAUDO SEGURIDAD SOCIAL
            </span>
            <DollarSign color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(totalPagoAcumulado)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Pagos procesados
          </p>
        </div>

        {/* Conductores con Pagos */}
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
              Conductores con Registro
            </span>
            <User color="#38bdf8" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.5rem', margin: 0 }}>
            {uniqueDriversCount} conductores
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            {drivers.length} conductores en total
          </p>
        </div>

        {/* Evento Asociado */}
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
              Evento Asociado
            </span>
            <CheckCircle2 color="#34d399" size={20} />
          </div>
          <p style={{ fontSize: '1.15rem', fontWeight: '700', color: '#34d399', marginTop: '0.5rem', margin: 0 }}>
            {ssEvento ? ssEvento.name : 'Pago Seguridad Social'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Valor Base Sugerido: {formatCurrency(ssEvento?.estimatedValue || 500000)}
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

        {/* Filtro Mes */}
        <select
          value={selectedMesFilter}
          onChange={(e) => setSelectedMesFilter(e.target.value)}
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
          <option value="">-- Todos los Meses --</option>
          {meses.map((m) => (
            <option key={m.id} value={m.id}>
              Mes {m.id}: {m.name} ({m.totalDays} días)
            </option>
          ))}
        </select>

        {(selectedDriverFilter || selectedMesFilter) && (
          <button
            onClick={() => {
              setSelectedDriverFilter('');
              setSelectedMesFilter('');
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
          onClick={loadSSocialRecords}
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

      {/* Tabla de Registros */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Cargando registros de pagos de Seguridad Social...</p>
        </div>
      ) : ssocialRecords.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <ShieldCheck size={48} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No hay registros de Seguridad Social
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Registra los pagos mensuales de seguridad social de los conductores de la flota.
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
            Registrar Pago Ahora
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
                  <th style={{ padding: '1rem 1.25rem' }}>Fecha Pago</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Conductor</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Mes Pagado</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Evento Asociado</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Valor Mes ($)</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Días Pagados</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Valor del Pago Final</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ssocialRecords.map((s) => (
                  <tr
                    key={s.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s',
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={14} color="var(--primary)" />
                        {s.date}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{s.tercero?.name || 'Conductor no asignado'}</div>
                      {s.tercero?.docNumber && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                          Doc: {s.tercero.docNumber}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          color: '#38bdf8',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          display: 'inline-block',
                        }}
                      >
                        📅 {s.mes?.name || `Mes ${s.mesId}`}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                      {s.evento?.name || 'Pago de Seguridad Social'}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                      {formatCurrency(s.monthValue)}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={14} color="#fbbf24" />
                        {s.daysPaid} / 30 días
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: '#34d399', fontSize: '0.95rem' }}>
                      {formatCurrency(s.paymentAmount)}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          title="Editar Registro"
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
                          onClick={() => setDeletingRecord(s)}
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

      {/* Modal Crear / Editar Registro */}
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
              maxWidth: '560px',
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
                <ShieldCheck size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {editingRecord ? 'Editar Pago de Seguridad Social' : 'Registrar Pago de Seguridad Social'}
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

                {/* Mes que se está pagando y Evento */}
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
                      Mes que se está Pagando *
                    </label>
                    <select
                      required
                      value={formMesId}
                      onChange={(e) => setFormMesId(parseInt(e.target.value, 10))}
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
                    >
                      {meses.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.totalDays} días)
                        </option>
                      ))}
                    </select>
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
                      Fecha de Consignación / Pago *
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
                </div>

                {/* Evento Auto-seleccionado de la tabla Eventos */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.3rem',
                    }}
                  >
                    Evento de Mantenimiento / Seguridad Social
                  </label>
                  <input
                    type="text"
                    disabled
                    value={ssEvento ? `[${ssEvento.name}] - Traído de Catálogo Eventos` : 'Pago de Seguridad Social'}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-color)',
                      color: '#34d399',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                    }}
                  />
                </div>

                {/* Valor del Mes y Días Pagados */}
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
                      Valor del Mes ($) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1000"
                      placeholder="Ej: 500000"
                      value={formMonthValue}
                      onChange={(e) => setFormMonthValue(e.target.value)}
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
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                      Tarifa completa del mes (30 días).
                    </span>
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
                      Días Pagados (Base 30) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      placeholder="Ej: 30"
                      value={formDaysPaid}
                      onChange={(e) => setFormDaysPaid(e.target.value)}
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
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                      Por defecto 30 días (editable).
                    </span>
                  </div>
                </div>

                {/* Cálculo en vivo de la liquidación de Seguridad Social */}
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '10px',
                    border: '1px solid #10b981',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Fórmula de Liquidación:</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      ({formatCurrency(monthValNum)} / 30) x {daysPaidNum} días
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
                      <Calculator size={18} /> VALOR DEL PAGO A LIQUIDAR:
                    </span>
                    <span style={{ color: '#34d399' }}>{formatCurrency(computedFormPayment)}</span>
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
                  {saving ? 'Guardando...' : editingRecord ? 'Guardar Cambios' : 'Guardar Pago SS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación */}
      {deletingRecord && (
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
              ¿Eliminar registro de Seguridad Social?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              ¿Estás seguro de eliminar el pago de Seguridad Social del conductor{' '}
              <strong>{deletingRecord.tercero?.name}</strong> correspondiente al mes de{' '}
              <strong>{deletingRecord.mes?.name || `Mes ${deletingRecord.mesId}`}</strong>?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingRecord(null)}
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
                onClick={handleDeleteRecord}
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
