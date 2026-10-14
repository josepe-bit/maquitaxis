import React, { useState, useEffect } from 'react';
import {
  ahorroConductorService,
  DriverSavingsSummary,
} from '../services/ahorroConductorService';
import {
  DevolucionAhorroConductor,
  Tercero,
  CreateDevolucionAhorroInput,
} from '@maquitaxis/shared';
import { useAuth } from '../context/AuthContext';
import {
  PiggyBank,
  User,
  Calendar,
  DollarSign,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Clock,
  Coins,
  ShieldCheck,
  Search,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const DevolucionAhorroPage: React.FC = () => {
  const { tercero, rol, servicio } = useAuth();
  const targetServicioId = rol === 'NIVEL_2' ? servicio?.id ?? null : null;

  // Estados de datos
  const [devoluciones, setDevoluciones] = useState<DevolucionAhorroConductor[]>([]);
  const [drivers, setDrivers] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtros de bÃºsqueda
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [periodFromFilter, setPeriodFromFilter] = useState<string>('');
  const [periodToFilter, setPeriodToFilter] = useState<string>('');

  // Modal Registrar DevoluciÃ³n
  const [showModal, setShowModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del Formulario
  const [formDriverId, setFormDriverId] = useState<string>('');
  const [formPaymentDate, setFormPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formFromDate, setFormFromDate] = useState<string>('');
  const [formToDate, setFormToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formDetail, setFormDetail] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('0');
  const [formIdempotencyKey, setFormIdempotencyKey] = useState<string>('');

  // Consulta de Saldo en Vivo del Conductor en el Modal
  const [driverSummary, setDriverSummary] = useState<DriverSavingsSummary | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, [rol, servicio?.id]);

  useEffect(() => {
    loadDevoluciones();
  }, [selectedDriverFilter, startDateFilter, endDateFilter, periodFromFilter, periodToFilter]);

  const loadInitialData = async () => {
    try {
      const dList = await ahorroConductorService.fetchDrivers(targetServicioId);
      setDrivers(dList);
      await loadDevoluciones();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar datos iniciales.' });
      setLoading(false);
    }
  };

  const loadDevoluciones = async () => {
    setLoading(true);
    try {
      const list = await ahorroConductorService.fetchDevoluciones({
        driverId: selectedDriverFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        periodFrom: periodFromFilter || undefined,
        periodTo: periodToFilter || undefined,
        servicioId: targetServicioId,
      });
      setDevoluciones(list);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar el historial de devoluciones.' });
    } finally {
      setLoading(false);
    }
  };

  // Abrir Modal de Registro con Clave de Idempotencia Ãšnica por SesiÃ³n
  const handleOpenCreateModal = () => {
    const nowStr = new Date().toISOString().split('T')[0];
    setFormPaymentDate(nowStr);

    // Periodo sugerido: inicio de mes hasta hoy
    const firstDayMonth = new Date();
    firstDayMonth.setDate(1);
    setFormFromDate(firstDayMonth.toISOString().split('T')[0]);
    setFormToDate(nowStr);

    setFormDetail('DevoluciÃ³n de ahorro acumulado del conductor');
    setFormAmount('');
    setFormError(null);

    // Generar clave de idempotencia UUID v4 Ãºnica para prevenir desembolsos duplicados
    const newIdempKey =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
    setFormIdempotencyKey(newIdempKey);

    let defaultDriverId = drivers.length > 0 ? drivers[0].id : '';
    if (tercero?.is_driver && tercero.id) {
      defaultDriverId = tercero.id;
    }
    setFormDriverId(defaultDriverId);

    if (defaultDriverId) {
      fetchDriverBalance(defaultDriverId);
    } else {
      setDriverSummary(null);
    }

    setShowModal(true);
  };

  // Consultar Saldo en Vivo al cambiar conductor
  const fetchDriverBalance = async (driverId: string) => {
    if (!driverId) {
      setDriverSummary(null);
      return;
    }
    setLoadingBalance(true);
    try {
      const summary = await ahorroConductorService.getDriverSavingsSummary(driverId);
      setDriverSummary(summary);
      if (summary.availableBalance > 0 && (formAmount === '' || formAmount === '0')) {
        setFormAmount(summary.availableBalance.toString());
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al consultar saldo disponible.');
      setDriverSummary(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleDriverChange = (driverId: string) => {
    setFormDriverId(driverId);
    fetchDriverBalance(driverId);
  };

  // Guardar DevoluciÃ³n con PrevenciÃ³n Estricta de Doble EnvÃ­o e Idempotencia
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (saving) return; // PrevenciÃ³n de doble clic

    // Validaciones
    if (!formDriverId) {
      setFormError('Por favor selecciona un conductor.');
      return;
    }
    if (!formPaymentDate) {
      setFormError('La fecha de devoluciÃ³n es obligatoria.');
      return;
    }
    if (!formFromDate || !formToDate) {
      setFormError('Las fechas desde y hasta del periodo pagado son obligatorias.');
      return;
    }
    if (formToDate < formFromDate) {
      setFormError('La fecha final del periodo no puede ser anterior a la inicial.');
      return;
    }
    if (formPaymentDate < formFromDate) {
      setFormError('La fecha de pago no puede ser anterior al inicio del periodo.');
      return;
    }
    if (!formDetail || formDetail.trim() === '') {
      setFormError('Por favor especifica el detalle o motivo de la devoluciÃ³n.');
      return;
    }

    if (!formAmount || formAmount.trim() === '') {
      setFormError('El valor pagado es obligatorio.');
      return;
    }

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('El valor pagado debe ser estrictamente mayor a cero.');
      return;
    }

    if (!Number.isInteger(amt)) {
      setFormError('El valor pagado debe ser un número entero de pesos (sin decimales).');
      return;
    }

    if (driverSummary && amt > driverSummary.availableBalance) {
      setFormError(
        `El valor solicitado (${formatCurrency(amt)}) supera el saldo disponible actual (${formatCurrency(driverSummary.availableBalance)}).`
      );
      return;
    }

    setSaving(true);
    try {
      const input: CreateDevolucionAhorroInput = {
        driverId: formDriverId,
        paymentDate: formPaymentDate,
        fromDate: formFromDate,
        toDate: formToDate,
        detail: formDetail.trim(),
        amount: amt,
        servicioId: targetServicioId,
        idempotencyKey: formIdempotencyKey,
      };

      const result = await ahorroConductorService.registerDriverSavingsReturn(input);

      setFeedback({
        type: 'success',
        message: `Â¡DevoluciÃ³n de ahorro registrada con Ã©xito! Se devolvieron ${formatCurrency(
          result.returnedAmount
        )} a ${result.driverName}. Nuevo saldo disponible: ${formatCurrency(result.newAvailableBalance)}.`,
      });

      setShowModal(false);
      await loadDevoluciones();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la devoluciÃ³n de ahorro.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedDriverFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setPeriodFromFilter('');
    setPeriodToFilter('');
  };

  const calculateDaysInRange = (from: string, to: string) => {
    if (!from || !to) return 0;
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diffTime = d2.getTime() - d1.getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 3600 * 24)) + 1;
  };

  // MÃ©tricas Consolidadas
  const totalDevolucionesEntregadas = devoluciones.reduce((acc, d) => acc + d.amount, 0);
  const uniqueDriversCount = new Set(devoluciones.map((d) => d.driverId)).size;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              margin: 0,
            }}
          >
            <PiggyBank size={28} color="#38bdf8" />
            <span>DevoluciÃ³n de Ahorro del Conductor</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            MÃ³dulo independiente para registrar y consultar las devoluciones de ahorro acumulado de los conductores.
          </p>
        </div>

        {rol !== 'CONDUCTOR' && (
          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              backgroundColor: '#38bdf8',
              color: '#0f172a',
              border: 'none',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.9rem',
              boxShadow: '0 4px 12px rgba(56, 189, 248, 0.25)',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={18} />
            <span>Registrar DevoluciÃ³n de Ahorro</span>
          </button>
        )}
      </div>

      {/* Banner de Aislamiento y Regla Contable */}
      <div
        style={{
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
        }}
      >
        <ShieldCheck size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
        <div>
          <strong style={{ color: '#38bdf8' }}>Regla de Negocio Contable:</strong> Las devoluciones de ahorro residen en su persistencia especializada (<code>public.devoluciones_ahorro_conductor</code>). No alteran el cÃ¡lculo del producido neto del taxi, no se contabilizan como gasto operativo ni ingreso, y se mantienen completamente separadas de las prestaciones sociales.
        </div>
      </div>

      {/* Mensaje de Feedback */}
      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.9rem',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span style={{ flex: 1 }}>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* MÃ©tricas Consolidadas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              borderRadius: '10px',
              color: '#38bdf8',
            }}
          >
            <Coins size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Total Devoluciones Entregadas
            </span>
            <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38bdf8', margin: '0.2rem 0 0 0' }}>
              {formatCurrency(totalDevolucionesEntregadas)}
            </p>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              borderRadius: '10px',
              color: '#f59e0b',
            }}
          >
            <FileText size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Registros en Historial
            </span>
            <p style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
              {devoluciones.length} operaciones
            </p>
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              borderRadius: '10px',
              color: '#10b981',
            }}
          >
            <User size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Conductores Beneficiados
            </span>
            <p style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
              {uniqueDriversCount} conductores
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Independiente */}
      <div
        style={{
          background: 'var(--bg-card)',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Filtros del Historial de Devoluciones
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Conductor
            </label>
            <select
              value={selectedDriverFilter}
              onChange={(e) => setSelectedDriverFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="">Todos los conductores</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.docNumber ? `(${d.docNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Fecha DevoluciÃ³n Desde
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Fecha DevoluciÃ³n Hasta
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleResetFilters}
              style={{
                padding: '0.6rem 1rem',
                background: 'rgba(51, 65, 85, 0.4)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla del Historial Independiente */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Fecha DevoluciÃ³n</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Conductor</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Periodo Ahorro Devuelto</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Detalle / Motivo</th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: '700', textAlign: 'right' }}>
                  Valor Pagado
                </th>
                <th style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>Trazabilidad</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Cargando devoluciones de ahorro...</span>
                    </div>
                  </td>
                </tr>
              ) : devoluciones.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No se encontraron registros de devoluciones de ahorro con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                devoluciones.map((d) => {
                  const diasPeriodo = calculateDaysInRange(d.fromDate, d.toDate);
                  return (
                    <tr
                      key={d.id}
                      style={{
                        borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={15} color="#38bdf8" />
                          <span>{d.paymentDate}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                          {d.driver?.name || 'Conductor'}
                        </div>
                        {d.driver?.docNumber && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Doc: {d.driver.docNumber}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>
                          {d.fromDate} <span style={{ color: 'var(--text-secondary)' }}>â†’</span> {d.toDate}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {diasPeriodo} dÃ­as cubiertos
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                        <span title={d.detail} style={{ wordBreak: 'break-word' }}>
                          {d.detail}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: '800', color: '#38bdf8', fontSize: '0.95rem' }}>
                        {formatCurrency(d.amount)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock size={12} />
                            <span>{new Date(d.createdAt).toLocaleDateString('es-CO')}</span>
                          </div>
                          {d.isHistoric ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                color: '#fbbf24',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                width: 'fit-content',
                              }}
                            >
                              HistÃ³rico (LiquidaciÃ³n)
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid rgba(56, 189, 248, 0.4)',
                                color: '#38bdf8',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                width: 'fit-content',
                              }}
                            >
                              Independiente
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar DevoluciÃ³n de Ahorro */}
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
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: 0,
                }}
              >
                <PiggyBank size={22} color="#38bdf8" />
                <span>Registrar DevoluciÃ³n de Ahorro</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertTriangle size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 1. Seleccionar Conductor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Conductor Beneficiario *
                  </label>
                  <select
                    required
                    value={formDriverId}
                    onChange={(e) => handleDriverChange(e.target.value)}
                    disabled={rol === 'CONDUCTOR'}
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
                    <option value="">-- Seleccionar Conductor --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.docNumber ? `(Doc: ${d.docNumber})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tarjeta de Saldo en Vivo del Conductor */}
                {formDriverId && (
                  <div
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#38bdf8' }}>
                        ESTADO DE CUENTA DE AHORRO
                      </span>
                      {loadingBalance && <RefreshCw size={14} className="animate-spin" color="#38bdf8" />}
                    </div>

                    {driverSummary ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Ahorro Generado</span>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              {formatCurrency(driverSummary.totalGenerated)}
                            </strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Total Devuelto</span>
                            <strong style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
                              {formatCurrency(driverSummary.totalReturned)}
                            </strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Saldo Disponible</span>
                            <strong style={{ fontSize: '0.95rem', color: driverSummary.availableBalance > 0 ? '#34d399' : '#ef4444' }}>
                              {formatCurrency(driverSummary.availableBalance)}
                            </strong>
                          </div>
                        </div>

                        {driverSummary.availableBalance > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormAmount(driverSummary.availableBalance.toString())}
                            style={{
                              marginTop: '0.6rem',
                              width: '100%',
                              padding: '0.35rem 0.5rem',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Usar Saldo Total Disponible
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        No se pudo determinar el saldo del conductor.
                      </span>
                    )}
                  </div>
                )}

                {/* 2. Fecha de devoluciÃ³n y Valor pagado */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Fecha DevoluciÃ³n *
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

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Valor Pagado (COP) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step={1}
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="Ej. 270000"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-dark)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* 3. Periodo Pagado (Desde -> Hasta) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
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
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
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
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* 4. Detalle de DevoluciÃ³n */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Detalle / Motivo de DevoluciÃ³n *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formDetail}
                    onChange={(e) => setFormDetail(e.target.value)}
                    placeholder="DescripciÃ³n de la entrega de fondos acumulados al conductor..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Botones de AcciÃ³n */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    backgroundColor: '#38bdf8',
                    border: 'none',
                    color: '#0f172a',
                    fontWeight: '700',
                    cursor: saving ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {saving && <RefreshCw size={16} className="animate-spin" />}
                  <span>{saving ? 'Guardando...' : 'Confirmar DevoluciÃ³n'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};