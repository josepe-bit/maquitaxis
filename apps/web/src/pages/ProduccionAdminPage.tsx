import React, { useState, useEffect } from 'react';
import {
  produccionService,
  CreateProduccionInput,
  UpdateProduccionInput,
  SavingsSummaryResult,
} from '../services/produccionService';
import { ProduccionDiaria, Vehiculo, ProductionStatus } from '@maquitaxis/shared';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Calendar,
  Plus,
  Car,
  X,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  PiggyBank,
  Info,
  SlidersHorizontal,
  Coins,
  Receipt,
} from 'lucide-react';

export const ProduccionAdminPage: React.FC = () => {
  const { tercero } = useAuth();
  const [producciones, setProducciones] = useState<ProduccionDiaria[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtros
  const [selectedVehiculoFilter, setSelectedVehiculoFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal para Crear / Editar Producción Diaria
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingProduccion, setEditingProduccion] = useState<ProduccionDiaria | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del formulario de producción
  const [formVehiculoId, setFormVehiculoId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<ProductionStatus>('trabajo');
  const [formAmount, setFormAmount] = useState<string>('0');
  const [formSavingsAmount, setFormSavingsAmount] = useState<string>('0');
  const [formMileage, setFormMileage] = useState<string>('0');

  // Modal de Liquidación / Devolución de Ahorros del Conductor
  const [showSavingsModal, setShowSavingsModal] = useState<boolean>(false);
  const [savingsVehiculoId, setSavingsVehiculoId] = useState<string>('');
  const [savingsFromDate, setSavingsFromDate] = useState<string>('');
  const [savingsToDate, setSavingsToDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [savingsSummary, setSavingsSummary] = useState<SavingsSummaryResult | null>(null);
  const [calculatingSavings, setCalculatingSavings] = useState<boolean>(false);
  const [liquidating, setLiquidating] = useState<boolean>(false);
  const [savingsError, setSavingsError] = useState<string | null>(null);
  const [savingsNotes, setSavingsNotes] = useState<string>('');

  // Modal de Eliminación
  const [deletingProduccion, setDeletingProduccion] = useState<ProduccionDiaria | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadProducciones();
  }, [selectedVehiculoFilter, startDateFilter, endDateFilter, statusFilter]);

  const loadInitialData = async () => {
    try {
      const vList = await produccionService.fetchVehiculosForProduction();
      setVehiculos(vList);
      await loadProducciones();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar los datos iniciales.' });
      setLoading(false);
    }
  };

  const loadProducciones = async () => {
    setLoading(true);
    try {
      const list = await produccionService.fetchProducciones(
        selectedVehiculoFilter || undefined,
        startDateFilter || undefined,
        endDateFilter || undefined
      );

      const filtered = statusFilter
        ? list.filter((p) => p.status === statusFilter)
        : list;

      setProducciones(filtered);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar registros de producción.' });
    } finally {
      setLoading(false);
    }
  };

  // Abrir Modal de Creación
  const handleOpenCreateModal = () => {
    setEditingProduccion(null);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStatus('trabajo');
    setFormError(null);

    let defaultVehiculoId = '';
    if (tercero?.id) {
      const assigned = vehiculos.find((v) => v.driverId === tercero.id);
      if (assigned) {
        defaultVehiculoId = assigned.id;
      }
    }
    if (!defaultVehiculoId && vehiculos.length > 0) {
      defaultVehiculoId = vehiculos[0].id;
    }

    setFormVehiculoId(defaultVehiculoId);
    if (defaultVehiculoId) {
      autoFillFromVehicle(defaultVehiculoId, 'trabajo');
    } else {
      setFormAmount('0');
      setFormSavingsAmount('0');
      setFormMileage('0');
    }

    setShowModal(true);
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (p: ProduccionDiaria) => {
    setEditingProduccion(p);
    setFormVehiculoId(p.vehiculoId);
    setFormDate(p.date);
    setFormStatus(p.status);
    setFormAmount(p.amount ? p.amount.toString() : '0');
    setFormSavingsAmount(p.savingsAmount ? p.savingsAmount.toString() : '0');
    setFormMileage(p.mileage ? p.mileage.toString() : '0');
    setFormError(null);
    setShowModal(true);
  };

  // Auto-llenado de Cuota y Ahorro desde el vehículo seleccionado
  const autoFillFromVehicle = (vehiculoId: string, currentStatus: ProductionStatus) => {
    const targetVehiculo = vehiculos.find((v) => v.id === vehiculoId);
    if (currentStatus === 'trabajo' && targetVehiculo) {
      setFormAmount(targetVehiculo.dailyFee ? targetVehiculo.dailyFee.toString() : '0');
      setFormSavingsAmount(targetVehiculo.savingsAmount ? targetVehiculo.savingsAmount.toString() : '0');
    } else {
      setFormAmount('0');
      setFormSavingsAmount('0');
    }
  };

  const handleVehiculoChangeInForm = (vehiculoId: string) => {
    setFormVehiculoId(vehiculoId);
    autoFillFromVehicle(vehiculoId, formStatus);
  };

  const handleStatusChangeInForm = (newStatus: ProductionStatus) => {
    setFormStatus(newStatus);
    if (newStatus === 'trabajo') {
      autoFillFromVehicle(formVehiculoId, newStatus);
    } else {
      setFormAmount('0');
      setFormSavingsAmount('0');
    }
  };

  // Guardar Producción
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formVehiculoId) {
      setFormError('Por favor selecciona un vehículo/taxi.');
      return;
    }
    if (!formDate) {
      setFormError('La fecha de producción es obligatoria.');
      return;
    }

    const amt = parseFloat(formAmount) || 0;
    const sav = parseFloat(formSavingsAmount) || 0;
    const mil = parseInt(formMileage, 10) || 0;

    if (formStatus === 'trabajo' && amt < 0) {
      setFormError('El valor de la cuota no puede ser negativo.');
      return;
    }

    setSaving(true);
    try {
      if (editingProduccion) {
        const updateInput: UpdateProduccionInput = {
          vehiculoId: formVehiculoId,
          date: formDate,
          status: formStatus,
          amount: amt,
          savingsAmount: sav,
          deduction: 0, // Eliminado por regla de negocio
          mileage: mil,
        };
        await produccionService.updateProduccion(editingProduccion.id, updateInput);
        setFeedback({ type: 'success', message: `Registro de producción del ${formDate} actualizado correctamente.` });
      } else {
        const createInput: CreateProduccionInput = {
          vehiculoId: formVehiculoId,
          date: formDate,
          status: formStatus,
          amount: amt,
          savingsAmount: sav,
          deduction: 0, // Eliminado por regla de negocio
          mileage: mil,
        };
        await produccionService.createProduccion(createInput);
        setFeedback({ type: 'success', message: `Producción del ${formDate} registrada exitosamente.` });
      }

      setShowModal(false);
      await loadProducciones();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el registro de producción.');
    } finally {
      setSaving(false);
    }
  };

  // Abrir Modal de Devolución de Ahorros
  const handleOpenSavingsModal = () => {
    setSavingsVehiculoId(vehiculos.length > 0 ? vehiculos[0].id : '');
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setSavingsFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
    setSavingsToDate(now.toISOString().split('T')[0]);
    setSavingsSummary(null);
    setSavingsError(null);
    setSavingsNotes('');
    setShowSavingsModal(true);
  };

  // Consultar Ahorro Acumulado
  const handleCalculateSavings = async () => {
    setSavingsError(null);
    if (!savingsVehiculoId) {
      setSavingsError('Por favor selecciona un vehículo/taxi.');
      return;
    }
    if (!savingsFromDate || !savingsToDate) {
      setSavingsError('Por favor selecciona las fechas desde y hasta.');
      return;
    }

    setCalculatingSavings(true);
    try {
      const summary = await produccionService.calculateSavingsSummary(
        savingsVehiculoId,
        savingsFromDate,
        savingsToDate
      );
      setSavingsSummary(summary);
    } catch (err: any) {
      setSavingsError(err.message || 'Error al consultar el ahorro acumulado.');
    } finally {
      setCalculatingSavings(false);
    }
  };

  // Procesar Registro de Devolución de Ahorro
  const handleConfirmLiquidacionAhorro = async () => {
    if (!savingsSummary || !savingsSummary.driverTerceroId) {
      setSavingsError('No se encontró un conductor vinculado a este vehículo en el periodo.');
      return;
    }
    if (savingsSummary.totalSavingsAmount <= 0) {
      setSavingsError('El ahorro acumulado a devolver en este periodo es $0.');
      return;
    }

    setLiquidating(true);
    setSavingsError(null);
    try {
      await produccionService.registerLiquidacionAhorro(
        savingsSummary.driverTerceroId,
        savingsSummary.fromDate,
        savingsSummary.toDate,
        savingsSummary.totalSavingsAmount,
        savingsNotes
      );

      setFeedback({
        type: 'success',
        message: `¡Devolución de Ahorro registrada exitosamente! Se devolvió un total de ${formatCurrency(
          savingsSummary.totalSavingsAmount
        )} al conductor ${savingsSummary.driverName} (Periodo ${savingsSummary.fromDate} a ${savingsSummary.toDate}).`,
      });

      setShowSavingsModal(false);
    } catch (err: any) {
      setSavingsError(err.message || 'Error al procesar la liquidación del ahorro.');
    } finally {
      setLiquidating(false);
    }
  };

  // Eliminar producción
  const handleDeleteProduccion = async () => {
    if (!deletingProduccion) return;
    setDeleting(true);
    try {
      await produccionService.deleteProduccion(deletingProduccion.id);
      setFeedback({ type: 'success', message: `Registro de producción del ${deletingProduccion.date} eliminado.` });
      setDeletingProduccion(null);
      await loadProducciones();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'No se pudo eliminar el registro.' });
    } finally {
      setDeleting(false);
    }
  };

  // Métricas Consolidadas
  const totalBaseCuotas = producciones.reduce((acc, p) => acc + (p.status === 'trabajo' ? p.amount : 0), 0);
  const totalSavings = producciones.reduce((acc, p) => acc + (p.status === 'trabajo' ? p.savingsAmount : 0), 0);
  const totalHandedCash = totalBaseCuotas + totalSavings;

  const countTrabajo = producciones.filter((p) => p.status === 'trabajo').length;
  const countPicoPlaca = producciones.filter((p) => p.status === 'pico_y_placa').length;
  const countTallerDescanso = producciones.filter((p) => p.status === 'taller' || p.status === 'descanso').length;

  // Cálculo en tiempo real en el formulario
  const currentFormAmountNum = parseFloat(formAmount) || 0;
  const currentFormSavingsNum = parseFloat(formSavingsAmount) || 0;
  const currentFormTotalHanded = currentFormAmountNum + currentFormSavingsNum;

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
            <DollarSign size={26} color="var(--primary)" />
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Producción Diaria de Vehículos
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
            Registro diario de cuota del taxi (propietario) y el ahorro que entrega el conductor (suma total entregada al dueño).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenSavingsModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.1rem',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              color: '#38bdf8',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            <PiggyBank size={18} />
            <span>Devolución de Ahorros Conductor</span>
          </button>

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
            <span>Registrar Producción del Día</span>
          </button>
        </div>
      </div>

      {/* Alerta de notificación / Feedback */}
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

      {/* Tarjetas de Métricas KPI */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Cuotas Base Propietario */}
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
              Cuotas Taxi (Propietario)
            </span>
            <TrendingUp color="#34d399" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#34d399', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(totalBaseCuotas)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Suma de producido del vehículo
          </p>
        </div>

        {/* Fondo Ahorro Conductor */}
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            backgroundColor: 'rgba(56, 189, 248, 0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: '700' }}>
              Ahorro Acumulado Conductores
            </span>
            <PiggyBank color="#38bdf8" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(totalSavings)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Guardado para devoluciones
          </p>
        </div>

        {/* Total Efectivo Entregado al Dueño */}
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
              TOTAL EFECTIVO RECIBIDO
            </span>
            <Coins color="var(--primary)" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--primary)', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(totalHandedCash)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Suma de Cuota + Ahorro
          </p>
        </div>

        {/* Días Registrados */}
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
              Días Registrados
            </span>
            <Calendar color="#a855f7" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {producciones.length} días
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            {countTrabajo} trabajó | {countPicoPlaca} pico/placa | {countTallerDescanso} taller/descanso
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

        {/* Filtro por Taxi */}
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

        {/* Filtro por Estado */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
          <option value="">-- Todos los Estados --</option>
          <option value="trabajo">🟢 Trabajó</option>
          <option value="pico_y_placa">🟡 Pico y Placa</option>
          <option value="taller">🔴 Taller / Mantenimiento</option>
          <option value="descanso">🔵 Descanso / No Trabajó</option>
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
          title="Fecha Desde"
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
          title="Fecha Hasta"
        />

        {(selectedVehiculoFilter || statusFilter || startDateFilter || endDateFilter) && (
          <button
            onClick={() => {
              setSelectedVehiculoFilter('');
              setStatusFilter('');
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
          onClick={loadProducciones}
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

      {/* Tabla de Producciones */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Cargando registros de producción diaria...</p>
        </div>
      ) : producciones.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
          }}
        >
          <DollarSign size={48} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No se encontraron registros de producción
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Aún no se han registrado producidos para los filtros seleccionados.
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
            Registrar Producción Hoy
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
                  <th style={{ padding: '1rem 1.25rem' }}>Conductor</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Estado Jornada</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Cuota Taxi (Propietario)</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Ahorro Conductor</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Total Entregado</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Km Final</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {producciones.map((p) => {
                  const isWorking = p.status === 'trabajo';
                  const handedCash = isWorking ? p.amount + p.savingsAmount : 0;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: '0.875rem',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} color="var(--primary)" />
                          {p.date}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Car size={15} />
                          Taxi {p.vehiculo?.plate || '---'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                        {p.vehiculo?.driver?.name || 'Sin conductor'}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        {p.status === 'trabajo' && (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '700',
                              color: '#34d399',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}
                          >
                            🟢 TRABAJÓ
                          </span>
                        )}
                        {p.status === 'pico_y_placa' && (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '700',
                              color: '#fbbf24',
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                            }}
                          >
                            🟡 PICO Y PLACA
                          </span>
                        )}
                        {p.status === 'taller' && (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '700',
                              color: '#f87171',
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            🔴 TALLER
                          </span>
                        )}
                        {p.status === 'descanso' && (
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: '700',
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                            }}
                          >
                            🔵 DESCANSO
                          </span>
                        )}
                      </td>

                      {/* Cuota Base */}
                      <td style={{ padding: '1rem 1.25rem', fontWeight: isWorking ? '600' : 'normal', color: isWorking ? '#34d399' : 'var(--text-secondary)' }}>
                        {isWorking ? formatCurrency(p.amount) : '$0'}
                      </td>

                      {/* Ahorro Conductor */}
                      <td style={{ padding: '1rem 1.25rem', fontWeight: isWorking && p.savingsAmount > 0 ? '700' : 'normal', color: isWorking && p.savingsAmount > 0 ? '#38bdf8' : 'var(--text-secondary)' }}>
                        {isWorking && p.savingsAmount > 0 ? formatCurrency(p.savingsAmount) : '$0'}
                      </td>

                      {/* Total Entregado al Dueño */}
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: isWorking ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        {formatCurrency(handedCash)}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                        {p.mileage ? `${p.mileage.toLocaleString()} km` : '---'}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenEditModal(p)}
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
                            onClick={() => setDeletingProduccion(p)}
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

      {/* Modal de Crear / Editar Producción Diaria */}
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
                <DollarSign size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {editingProduccion ? 'Editar Registro de Producción' : 'Registrar Producción Diaria'}
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
                    onChange={(e) => handleVehiculoChangeInForm(e.target.value)}
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
                        Taxi {v.plate} (Cuota: {formatCurrency(v.dailyFee)} | Ahorro:{' '}
                        {formatCurrency(v.savingsAmount)} | Conductor: {v.driver ? v.driver.name : 'Sin asignar'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
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
                    Fecha de la Jornada *
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

                {/* Estado de la Jornada */}
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
                    Estado de la Jornada *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <button
                      type="button"
                      onClick={() => handleStatusChangeInForm('trabajo')}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: formStatus === 'trabajo' ? '1px solid #10b981' : '1px solid var(--border-color)',
                        backgroundColor: formStatus === 'trabajo' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-dark)',
                        color: formStatus === 'trabajo' ? '#34d399' : 'var(--text-secondary)',
                        fontWeight: formStatus === 'trabajo' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      🟢 TRABAJÓ
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChangeInForm('pico_y_placa')}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: formStatus === 'pico_y_placa' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                        backgroundColor: formStatus === 'pico_y_placa' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-dark)',
                        color: formStatus === 'pico_y_placa' ? '#fbbf24' : 'var(--text-secondary)',
                        fontWeight: formStatus === 'pico_y_placa' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      🟡 PICO Y PLACA
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChangeInForm('taller')}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: formStatus === 'taller' ? '1px solid #ef4444' : '1px solid var(--border-color)',
                        backgroundColor: formStatus === 'taller' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-dark)',
                        color: formStatus === 'taller' ? '#f87171' : 'var(--text-secondary)',
                        fontWeight: formStatus === 'taller' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      🔴 TALLER / MANTENIMIENTO
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChangeInForm('descanso')}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: formStatus === 'descanso' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                        backgroundColor: formStatus === 'descanso' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-dark)',
                        color: formStatus === 'descanso' ? '#38bdf8' : 'var(--text-secondary)',
                        fontWeight: formStatus === 'descanso' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      🔵 DESCANSO
                    </button>
                  </div>
                </div>

                {/* Si TRABAJÓ: Cuota y Ahorro Conductor */}
                {formStatus === 'trabajo' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {/* Cuota Base del Taxi */}
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
                          Valor Cuota Taxi ($) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1000"
                          placeholder="Ej: 110000"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
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
                          Valor del producido que le pertenece al dueño del taxi.
                        </span>
                      </div>

                      {/* Ahorro Conductor */}
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
                          Ahorro Conductor ($) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1000"
                          placeholder="Ej: 10000"
                          value={formSavingsAmount}
                          onChange={(e) => setFormSavingsAmount(e.target.value)}
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
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                          Dinero adicional ahorrado que se le guarda al conductor.
                        </span>
                      </div>
                    </div>

                    {/* Kilometraje Final */}
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
                        Kilometraje Final de Jornada (Km)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ej: 145200"
                        value={formMileage}
                        onChange={(e) => setFormMileage(e.target.value)}
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

                    {/* Resumen Calculado en Vivo en el Formulario */}
                    <div
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        borderRadius: '10px',
                        border: '1px solid var(--primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Cuota Taxi (Dueño):</span>
                        <span style={{ fontWeight: '700', color: '#34d399' }}>
                          {formatCurrency(currentFormAmountNum)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>(+) Ahorro Conductor (Guardado):</span>
                        <span style={{ fontWeight: '700', color: '#38bdf8' }}>
                          +{formatCurrency(currentFormSavingsNum)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '1rem',
                          fontWeight: '800',
                          paddingTop: '0.4rem',
                          borderTop: '1px dashed var(--border-color)',
                        }}
                      >
                        <span style={{ color: 'var(--primary)' }}>TOTAL EFECTIVO A RECIBIR POR EL DUEÑO:</span>
                        <span style={{ color: 'var(--primary)' }}>{formatCurrency(currentFormTotalHanded)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(148, 163, 184, 0.08)',
                      border: '1px dashed var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Info size={18} color="#38bdf8" />
                    <span>
                      Al estar en estado <strong>{formStatus.replace('_', ' ').toUpperCase()}</strong>, no se registrará cuota ni ahorro ($0).
                    </span>
                  </div>
                )}
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
                  {saving ? 'Guardando...' : editingProduccion ? 'Guardar Cambios' : 'Guardar Producción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Devolución / Liquidación de Ahorro del Conductor */}
      {showSavingsModal && (
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
            {/* Header Modal Ahorros */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PiggyBank size={24} color="#38bdf8" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Devolución de Ahorro Acumulado del Conductor
                </h2>
              </div>
              <button
                onClick={() => setShowSavingsModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body Ahorros */}
            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {savingsError && (
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
                  {savingsError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Seleccionar Taxi / Conductor */}
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
                    value={savingsVehiculoId}
                    onChange={(e) => {
                      setSavingsVehiculoId(e.target.value);
                      setSavingsSummary(null);
                    }}
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

                {/* Rango de Fechas */}
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
                      Fecha Desde *
                    </label>
                    <input
                      type="date"
                      value={savingsFromDate}
                      onChange={(e) => {
                        setSavingsFromDate(e.target.value);
                        setSavingsSummary(null);
                      }}
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
                      Fecha Hasta *
                    </label>
                    <input
                      type="date"
                      value={savingsToDate}
                      onChange={(e) => {
                        setSavingsToDate(e.target.value);
                        setSavingsSummary(null);
                      }}
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

                <button
                  type="button"
                  onClick={handleCalculateSavings}
                  disabled={calculatingSavings}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    fontWeight: '700',
                    cursor: calculatingSavings ? 'wait' : 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <RefreshCw size={16} className={calculatingSavings ? 'spin' : ''} />
                  <span>{calculatingSavings ? 'Consultando...' : 'Calcular Ahorro Acumulado en el Periodo'}</span>
                </button>

                {/* Resultado del Resumen de Ahorro */}
                {savingsSummary && (
                  <div
                    style={{
                      padding: '1.25rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '12px',
                      border: '1px solid #38bdf8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Conductor Evaluado:</span>
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {savingsSummary.driverName} (Taxi {savingsSummary.vehiculoPlate})
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Periodo de Ahorro:</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                        {savingsSummary.fromDate} a {savingsSummary.toDate} ({savingsSummary.totalDaysWorked} días trabajados)
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Cuotas Abonadas:</span>
                      <span style={{ fontSize: '0.9rem', color: '#34d399', fontWeight: '700' }}>
                        {formatCurrency(savingsSummary.totalBaseCuotas)}
                      </span>
                    </div>

                    <div
                      style={{
                        paddingTop: '0.75rem',
                        marginTop: '0.25rem',
                        borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <PiggyBank size={20} /> AHORRO TOTAL A DEVOLVER:
                      </span>
                      <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38bdf8' }}>
                        {formatCurrency(savingsSummary.totalSavingsAmount)}
                      </span>
                    </div>

                    {/* Observaciones opcionales */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: 'var(--text-secondary)',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Observaciones / Detalle del Pago (Opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Entregado en efectivo al conductor a su solicitud"
                        value={savingsNotes}
                        onChange={(e) => setSavingsNotes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-dark)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Buttons Modal Ahorro */}
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
                  onClick={() => setShowSavingsModal(false)}
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
                  Cerrar
                </button>
                {savingsSummary && savingsSummary.totalSavingsAmount > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmLiquidacionAhorro}
                    disabled={liquidating}
                    style={{
                      padding: '0.6rem 1.4rem',
                      borderRadius: '8px',
                      backgroundColor: '#38bdf8',
                      border: 'none',
                      color: 'var(--bg-dark)',
                      fontWeight: '800',
                      cursor: liquidating ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Receipt size={18} />
                    <span>{liquidating ? 'Procesando...' : 'Registrar Devolución de Ahorro'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      {deletingProduccion && (
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
              ¿Eliminar registro de producción?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              ¿Estás seguro de que deseas eliminar el registro de producción del vehículo <strong>Taxi {deletingProduccion.vehiculo?.plate || ''}</strong> fecha <strong>{deletingProduccion.date}</strong>?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingProduccion(null)}
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
                onClick={handleDeleteProduccion}
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
