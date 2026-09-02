import React, { useState, useEffect } from 'react';
import {
  produccionService,
  CreateProduccionInput,
  UpdateProduccionInput,
} from '../services/produccionService';
import { liquidacionService } from '../services/liquidacionService';
import {
  ProduccionDiaria,
  Vehiculo,
  ProductionStatus,
  ShiftType,
  Tercero,
  DriverSavingsSummary,
} from '@maquitaxis/shared';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  X,
  Edit3,
  Trash2,
  PiggyBank,
  Info,
  SlidersHorizontal,
  Coins,
  Sun,
  Moon,
  User,
  CheckCircle2,
} from 'lucide-react';

export const ProduccionAdminPage: React.FC = () => {
  const { tercero } = useAuth();
  const [producciones, setProducciones] = useState<ProduccionDiaria[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [drivers, setDrivers] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtros
  const [selectedVehiculoFilter, setSelectedVehiculoFilter] = useState<string>('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('');
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
  const [formShift, setFormShift] = useState<ShiftType>('dia');
  const [formDriverId, setFormDriverId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<ProductionStatus>('trabajo');
  const [formAmount, setFormAmount] = useState<string>('0');
  const [formSavingsAmount, setFormSavingsAmount] = useState<string>('0');
  const [formMileage, setFormMileage] = useState<string>('0');

  // Modal de Devolución de Ahorros por Conductor (CONSOLIDADO ÚNICO)
  const [showSavingsModal, setShowSavingsModal] = useState<boolean>(false);
  const [savingsDriverId, setSavingsDriverId] = useState<string>('');
  const [driverSummary, setDriverSummary] = useState<DriverSavingsSummary | null>(null);
  const [savingsAmountInput, setSavingsAmountInput] = useState<string>('0');
  const [savingsNotes, setSavingsNotes] = useState<string>('');
  const [calculatingSavings, setCalculatingSavings] = useState<boolean>(false);
  const [liquidating, setLiquidating] = useState<boolean>(false);
  const [savingsError, setSavingsError] = useState<string | null>(null);

  // Modal de Eliminación
  const [deletingProduccion, setDeletingProduccion] = useState<ProduccionDiaria | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadProducciones();
  }, [selectedVehiculoFilter, selectedShiftFilter, startDateFilter, endDateFilter, statusFilter]);

  const loadInitialData = async () => {
    try {
      const [vList, dList] = await Promise.all([
        produccionService.fetchVehiculosForProduction(),
        liquidacionService.fetchDrivers(),
      ]);
      setVehiculos(vList);
      setDrivers(dList);
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
        endDateFilter || undefined,
        (selectedShiftFilter as ShiftType) || undefined
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
    setFormShift('dia');
    setFormStatus('trabajo');
    setFormError(null);

    let defaultVehiculoId = vehiculos.length > 0 ? vehiculos[0].id : '';
    setFormVehiculoId(defaultVehiculoId);

    if (defaultVehiculoId) {
      autoFillShiftConfig(defaultVehiculoId, 'dia', 'trabajo');
    } else {
      setFormDriverId('');
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
    setFormShift(p.shift || 'dia');
    setFormDriverId(p.driverId || '');
    setFormStatus(p.status);
    setFormAmount(p.amount ? p.amount.toString() : '0');
    setFormSavingsAmount(p.savingsAmount ? p.savingsAmount.toString() : '0');
    setFormMileage(p.mileage ? p.mileage.toString() : '0');
    setFormError(null);
    setShowModal(true);
  };

  // Auto-llenado de valores según vehículo y turno seleccionado
  const autoFillShiftConfig = async (vehiculoId: string, shift: ShiftType, currentStatus: ProductionStatus) => {
    if (currentStatus !== 'trabajo') {
      setFormAmount('0');
      setFormSavingsAmount('0');
      return;
    }

    const turnos = await produccionService.fetchVehiculoTurnos(vehiculoId);
    const targetTurno = turnos.find((t) => t.shift === shift);
    const targetVehiculo = vehiculos.find((v) => v.id === vehiculoId);

    if (targetTurno) {
      setFormDriverId(targetTurno.driverId || targetVehiculo?.driverId || '');
      setFormAmount(targetTurno.dailyFee ? targetTurno.dailyFee.toString() : '0');
      setFormSavingsAmount(targetTurno.savingsAmount ? targetTurno.savingsAmount.toString() : '0');
    } else if (targetVehiculo) {
      setFormDriverId(targetVehiculo.driverId || '');
      setFormAmount(targetVehiculo.dailyFee ? targetVehiculo.dailyFee.toString() : '0');
      setFormSavingsAmount(targetVehiculo.savingsAmount ? targetVehiculo.savingsAmount.toString() : '0');
    } else {
      setFormAmount('0');
      setFormSavingsAmount('0');
    }
  };

  const handleVehiculoChangeInForm = (vehiculoId: string) => {
    setFormVehiculoId(vehiculoId);
    autoFillShiftConfig(vehiculoId, formShift, formStatus);
  };

  const handleShiftChangeInForm = (newShift: ShiftType) => {
    setFormShift(newShift);
    autoFillShiftConfig(formVehiculoId, newShift, formStatus);
  };

  const handleStatusChangeInForm = (newStatus: ProductionStatus) => {
    setFormStatus(newStatus);
    if (newStatus === 'trabajo') {
      autoFillShiftConfig(formVehiculoId, formShift, newStatus);
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
          shift: formShift,
          driverId: formDriverId || undefined,
          status: formStatus,
          amount: amt,
          savingsAmount: sav,
          deduction: 0,
          mileage: mil,
        };
        await produccionService.updateProduccion(editingProduccion.id, updateInput);
        setFeedback({
          type: 'success',
          message: `Producción (${formShift.toUpperCase()}) del ${formDate} actualizada correctamente.`,
        });
      } else {
        const createInput: CreateProduccionInput = {
          vehiculoId: formVehiculoId,
          date: formDate,
          shift: formShift,
          driverId: formDriverId || undefined,
          status: formStatus,
          amount: amt,
          savingsAmount: sav,
          deduction: 0,
          mileage: mil,
        };
        await produccionService.createProduccion(createInput);
        setFeedback({
          type: 'success',
          message: `Producción (${formShift.toUpperCase()}) del ${formDate} registrada exitosamente.`,
        });
      }

      setShowModal(false);
      await loadProducciones();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la producción.');
    } finally {
      setSaving(false);
    }
  };

  // Abrir Modal de Devolución de Ahorros por Conductor
  const handleOpenSavingsModal = () => {
    const defaultDriverId = drivers.length > 0 ? drivers[0].id : '';
    setSavingsDriverId(defaultDriverId);
    setDriverSummary(null);
    setSavingsAmountInput('0');
    setSavingsError(null);
    setSavingsNotes('');

    if (defaultDriverId) {
      fetchDriverSavingsBalance(defaultDriverId);
    }

    setShowSavingsModal(true);
  };

  // Consultar Saldo Acumulado del Conductor seleccionado
  const fetchDriverSavingsBalance = async (driverId: string) => {
    if (!driverId) return;
    setCalculatingSavings(true);
    setSavingsError(null);
    try {
      const summary = await produccionService.getDriverSavingsSummary(driverId);
      setDriverSummary(summary);
      setSavingsAmountInput(summary.availableBalance > 0 ? summary.availableBalance.toString() : '0');
    } catch (err: any) {
      setSavingsError(err.message || 'Error al consultar el saldo del conductor.');
    } finally {
      setCalculatingSavings(false);
    }
  };

  // Procesar Registro Atómico de Devolución de Ahorro
  const handleConfirmLiquidacionAhorro = async () => {
    if (!savingsDriverId || !driverSummary) {
      setSavingsError('Por favor selecciona un conductor.');
      return;
    }

    const amtToReturn = parseFloat(savingsAmountInput) || 0;

    if (amtToReturn <= 0) {
      setSavingsError('El monto a devolver debe ser mayor a cero.');
      return;
    }

    if (amtToReturn > driverSummary.availableBalance) {
      setSavingsError(
        `El monto a devolver ($${amtToReturn.toLocaleString('es-CO')}) supera el saldo disponible actual ($${driverSummary.availableBalance.toLocaleString('es-CO')}).`
      );
      return;
    }

    setLiquidating(true);
    setSavingsError(null);
    try {
      const res = await produccionService.registerDriverSavingsReturn(
        savingsDriverId,
        amtToReturn,
        savingsNotes
      );

      setFeedback({
        type: 'success',
        message: `¡Devolución de Ahorro registrada exitosamente! Se entregaron ${formatCurrency(
          amtToReturn
        )} al conductor ${driverSummary.driverName}. Nuevo saldo disponible: ${formatCurrency(
          res.newAvailableBalance
        )}.`,
      });

      setShowSavingsModal(false);
      await loadProducciones();
    } catch (err: any) {
      setSavingsError(err.message || 'Error al procesar la devolución de ahorro.');
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
              Producción Diaria por Turno
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
            Registro de cuota y ahorro por vehículo, fecha, turno (Día / Noche) y conductor asignado.
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
            <span>Devolución Ahorro Conductor</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.1rem',
              backgroundColor: 'var(--primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--bg-dark)',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            <DollarSign size={18} />
            <span>+ Registrar Producción</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedback.message}</span>
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
            Suma de producido en los turnos
          </p>
        </div>

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
              Ahorros Generados en Turnos
            </span>
            <PiggyBank color="#38bdf8" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(totalSavings)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Guardado para devolución por conductor
          </p>
        </div>

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
            Cuota + Ahorro del turno
          </p>
        </div>

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
              Turnos Registrados
            </span>
            <Calendar color="#a855f7" size={20} />
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {producciones.length} turnos
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
              Taxi {v.plate}
            </option>
          ))}
        </select>

        {/* Filtro por Turno */}
        <select
          value={selectedShiftFilter}
          onChange={(e) => setSelectedShiftFilter(e.target.value)}
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
          <option value="">-- Todos los Turnos --</option>
          <option value="dia">Turno DÍA</option>
          <option value="noche">Turno NOCHE</option>
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
          <option value="trabajo">TRABAJÓ</option>
          <option value="pico_y_placa">PICO Y PLACA</option>
          <option value="taller">TALLER</option>
          <option value="descanso">DESCANSO</option>
        </select>
      </div>

      {/* Tabla de Producción por Turno */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Cargando registros de producción...
        </div>
      ) : producciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No hay registros de producción registrados para estos filtros.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Fecha</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Taxi</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Turno</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Conductor del Turno</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Estado</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Cuota Taxi</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Ahorro Conductor</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Efectivo Recibido</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Km Final</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {producciones.map((p) => {
                  const isWorking = p.status === 'trabajo';
                  const handedCash = isWorking ? p.amount + p.savingsAmount : 0;
                  const driverName = p.driver?.name || p.vehiculo?.driver?.name || 'Histórico / No especificado';
                  const isDay = p.shift === 'dia';

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {p.date}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: 'var(--primary)' }}>
                        Taxi {p.vehiculo?.plate || '---'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.75rem',
                            fontWeight: '800',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            backgroundColor: isDay ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                            color: isDay ? '#f59e0b' : '#c084fc',
                            border: `1px solid ${isDay ? 'rgba(245, 158, 11, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                          }}
                        >
                          {isDay ? <Sun size={13} /> : <Moon size={13} />}
                          <span>{isDay ? 'TURNO DÍA' : 'TURNO NOCHE'}</span>
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User size={14} color="var(--text-secondary)" />
                          <span>{driverName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {p.status === 'trabajo' && (
                          <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            🟢 TRABAJÓ
                          </span>
                        )}
                        {p.status === 'pico_y_placa' && (
                          <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#fbbf24', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            🟡 PICO Y PLACA
                          </span>
                        )}
                        {p.status === 'taller' && (
                          <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            🔴 TALLER
                          </span>
                        )}
                        {p.status === 'descanso' && (
                          <span style={{ fontSize: '0.725rem', fontWeight: '700', color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            🔵 DESCANSO
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: isWorking ? '600' : 'normal', color: isWorking ? '#34d399' : 'var(--text-secondary)' }}>
                        {isWorking ? formatCurrency(p.amount) : '$0'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: isWorking && p.savingsAmount > 0 ? '700' : 'normal', color: isWorking && p.savingsAmount > 0 ? '#38bdf8' : 'var(--text-secondary)' }}>
                        {isWorking && p.savingsAmount > 0 ? formatCurrency(p.savingsAmount) : '$0'}
                      </td>
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
                            style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setDeletingProduccion(p)}
                            title="Eliminar Registro"
                            style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer' }}
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

      {/* Modal de Crear / Editar Producción Diaria por Turno */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '580px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(30, 41, 59, 0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {editingProduccion ? 'Editar Producción del Turno' : 'Registrar Producción por Turno'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {formError && (
                <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Vehículo */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Vehículo / Taxi *
                  </label>
                  <select
                    required
                    value={formVehiculoId}
                    onChange={(e) => handleVehiculoChangeInForm(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="">-- Selecciona el Taxi --</option>
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.id}>
                        Taxi {v.plate}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seleccionar Turno (DÍA / NOCHE) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Turno Operacional *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => handleShiftChangeInForm('dia')}
                      style={{
                        padding: '0.65rem',
                        borderRadius: '8px',
                        border: formShift === 'dia' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                        backgroundColor: formShift === 'dia' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-dark)',
                        color: formShift === 'dia' ? '#f59e0b' : 'var(--text-secondary)',
                        fontWeight: formShift === 'dia' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Sun size={18} />
                      <span>TURNO DÍA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShiftChangeInForm('noche')}
                      style={{
                        padding: '0.65rem',
                        borderRadius: '8px',
                        border: formShift === 'noche' ? '1px solid #c084fc' : '1px solid var(--border-color)',
                        backgroundColor: formShift === 'noche' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-dark)',
                        color: formShift === 'noche' ? '#c084fc' : 'var(--text-secondary)',
                        fontWeight: formShift === 'noche' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Moon size={18} />
                      <span>TURNO NOCHE</span>
                    </button>
                  </div>
                </div>

                {/* Seleccionar Conductor del Turno */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Conductor del Turno *
                  </label>
                  <select
                    value={formDriverId}
                    onChange={(e) => setFormDriverId(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="">-- Sin Conductor / No Especificado --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (CC: {d.docNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Fecha de la Jornada *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                {/* Estado de la Jornada */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
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
                        fontSize: '0.825rem',
                      }}
                    >
                      🔴 TALLER
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
                        fontSize: '0.825rem',
                      }}
                    >
                      🔵 DESCANSO
                    </button>
                  </div>
                </div>

                {formStatus === 'trabajo' ? (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        Cuota del Taxi del Turno ($) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        Ahorro del Conductor ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formSavingsAmount}
                        onChange={(e) => setFormSavingsAmount(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        Kilometraje Final (Km)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formMileage}
                        onChange={(e) => setFormMileage(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.6rem 1.4rem', borderRadius: '8px', backgroundColor: 'var(--primary)', border: 'none', color: 'var(--bg-dark)', fontWeight: '700', cursor: saving ? 'wait' : 'pointer' }}
                >
                  {saving ? 'Guardando...' : editingProduccion ? 'Guardar Cambios' : 'Guardar Producción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Devolución de Ahorro por Conductor (CONSOLIDADO ÚNICO) */}
      {showSavingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '560px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(56, 189, 248, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PiggyBank size={24} color="#38bdf8" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Devolución de Ahorro Acumulado
                </h2>
              </div>
              <button onClick={() => setShowSavingsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              {savingsError && (
                <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  {savingsError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Seleccionar Conductor */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Seleccionar Conductor *
                  </label>
                  <select
                    value={savingsDriverId}
                    onChange={(e) => {
                      setSavingsDriverId(e.target.value);
                      fetchDriverSavingsBalance(e.target.value);
                    }}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  >
                    <option value="">-- Selecciona Conductor --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (CC: {d.docNumber})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tarjeta de Saldo Único Consolidado */}
                {calculatingSavings ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: '#38bdf8' }}>Consultando saldo en tiempo real...</div>
                ) : driverSummary ? (
                  <div style={{ padding: '1.25rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid #38bdf8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                      CONDUCTOR: <span style={{ color: '#38bdf8' }}>{driverSummary.driverName}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>Total Ahorros Generados en Turnos:</span>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{formatCurrency(driverSummary.totalGenerated)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <span>(-) Total Ahorros Devueltos Previamente:</span>
                      <span style={{ fontWeight: '600', color: '#f87171' }}>-{formatCurrency(driverSummary.totalReturned)}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px dashed rgba(56, 189, 248, 0.4)' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#38bdf8' }}>
                        ABONO AHORRADO DISPONIBLE:
                      </span>
                      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#34d399' }}>
                        {formatCurrency(driverSummary.availableBalance)}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Monto a Devolver */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Monto A Devolver al Conductor ($) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={driverSummary?.availableBalance || 0}
                    value={savingsAmountInput}
                    onChange={(e) => setSavingsAmountInput(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Observaciones / Detalle del Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Entrega de ahorro en efectivo acordada"
                    value={savingsNotes}
                    onChange={(e) => setSavingsNotes(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', backgroundColor: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setShowSavingsModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={liquidating || !driverSummary || driverSummary.availableBalance <= 0}
                  onClick={handleConfirmLiquidacionAhorro}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    backgroundColor: '#38bdf8',
                    border: 'none',
                    color: '#0f172a',
                    fontWeight: '800',
                    cursor: liquidating || !driverSummary || driverSummary.availableBalance <= 0 ? 'not-allowed' : 'pointer',
                    opacity: liquidating || !driverSummary || driverSummary.availableBalance <= 0 ? 0.6 : 1,
                  }}
                >
                  {liquidating ? 'Procesando en BD...' : 'Confirmar y Entregar Ahorro'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Eliminación */}
      {deletingProduccion && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '420px', padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              ¿Eliminar registro de producción?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Taxi {deletingProduccion.vehiculo?.plate} - Turno {deletingProduccion.shift?.toUpperCase()} - {deletingProduccion.date}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button onClick={() => setDeletingProduccion(null)} style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleDeleteProduccion} disabled={deleting} style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontWeight: '700', cursor: deleting ? 'wait' : 'pointer' }}>
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
