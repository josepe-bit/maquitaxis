import React, { useState, useEffect } from 'react';
import { adminService, CreateVehiculoFullInput, UpdateVehiculoFullInput, VehiculoRelationsCount } from '../services/adminService';
import { servicioAppService } from '../services/servicioAppService';
import { Vehiculo, Tercero, Marca, ServicioApp, TaxiStatus } from '@maquitaxis/shared';
import { Car, Plus, Search, Filter, RefreshCw, UserCheck, ShieldCheck, Edit3, Trash2, Eye, AlertTriangle, MapPin, X, Calendar, DollarSign, Clock } from 'lucide-react';

export const VehiculosManagementPage: React.FC = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [serviciosApp, setServiciosApp] = useState<ServicioApp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
  const [viewingVehiculo, setViewingVehiculo] = useState<Vehiculo | null>(null);
  const [vehiculoRelations, setVehiculoRelations] = useState<VehiculoRelationsCount | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('2023');
  const [ownerId, setOwnerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [affiliatedCompanyId, setAffiliatedCompanyId] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  
  // Technical
  const [displacement, setDisplacement] = useState('1.2L');
  const [fuelType, setFuelType] = useState('Gasolina/Gas');
  const [passengerCapacity, setPassengerCapacity] = useState('4');
  const [serialNumber, setSerialNumber] = useState('');
  const [chassisNumber, setChassisNumber] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [color, setColor] = useState('Amarillo');

  // Operation Card
  const [operationCardNumber, setOperationCardNumber] = useState('');
  const [operationCardExpedition, setOperationCardExpedition] = useState('');
  const [operationCardValidityStart, setOperationCardValidityStart] = useState('');
  const [operationCardValidityEnd, setOperationCardValidityEnd] = useState('');

  // Operational Config
  const [dailyFee, setDailyFee] = useState('110000');
  const [startShiftTime, setStartShiftTime] = useState('05:00');
  const [endShiftTime, setEndShiftTime] = useState('19:00');
  const [savingsAmount, setSavingsAmount] = useState('10000');
  const [status, setStatus] = useState<TaxiStatus>('disponible');

  // Configuración de Turnos (Día / Noche)
  const [dayDriverId, setDayDriverId] = useState('');
  const [dayFee, setDayFee] = useState('110000');
  const [daySavings, setDaySavings] = useState('10000');

  const [nightDriverId, setNightDriverId] = useState('');
  const [nightFee, setNightFee] = useState('110000');
  const [nightSavings, setNightSavings] = useState('10000');


  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vList, tList, mList, sList] = await Promise.all([
        adminService.fetchVehiculos(searchQuery, statusFilter),
        adminService.fetchTerceros(),
        adminService.fetchMarcas(),
        adminService.fetchServiciosApp(),
      ]);
      setVehiculos(vList);
      setTerceros(tList);
      setMarcas(mList);
      setServiciosApp(sList);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingVehiculo(null);
    setErrorMsg(null);
    setPlate('');
    setModel('2023');
    
    const firstOwner = terceros.find((t) => t.isOwner);
    setOwnerId(firstOwner ? firstOwner.id : '');
    setDriverId('');
    setAffiliatedCompanyId('');
    
    setServicioId(serviciosApp[0]?.id || '');
    setMarcaId(marcas[0]?.id || '');
    setDisplacement('1.2L');
    setFuelType('Gasolina/Gas');
    setPassengerCapacity('4');
    setSerialNumber('');
    setChassisNumber('');
    setEngineNumber('');
    setColor('Amarillo');
    
    setOperationCardNumber('');
    setOperationCardExpedition('');
    setOperationCardValidityStart('');
    setOperationCardValidityEnd('');
    
    setDailyFee('110000');
    setStartShiftTime('05:00');
    setEndShiftTime('19:00');
    setSavingsAmount('10000');
    setStatus('disponible');

    setDayDriverId('');
    setDayFee('110000');
    setDaySavings('10000');

    setNightDriverId('');
    setNightFee('110000');
    setNightSavings('10000');

    setShowFormModal(true);
  };

  const handleOpenEditModal = (v: Vehiculo) => {
    setEditingVehiculo(v);
    setErrorMsg(null);
    setPlate(v.plate);
    setModel(v.model);
    setOwnerId(v.ownerId);
    setDriverId(v.driverId || '');
    setAffiliatedCompanyId(v.affiliatedCompanyId || '');
    setServicioId(v.servicioId);
    setMarcaId(v.marcaId || '');
    
    setDisplacement(v.displacement || '1.2L');
    setFuelType(v.fuelType || 'Gasolina/Gas');
    setPassengerCapacity(String(v.passengerCapacity || 4));
    setSerialNumber(v.serialNumber || '');
    setChassisNumber(v.chassisNumber || '');
    setEngineNumber(v.engineNumber || '');
    setColor(v.color || 'Amarillo');
    
    setOperationCardNumber(v.operationCardNumber || '');
    setOperationCardExpedition(v.operationCardExpedition ? v.operationCardExpedition.substring(0, 10) : '');
    setOperationCardValidityStart(v.operationCardValidityStart ? v.operationCardValidityStart.substring(0, 10) : '');
    setOperationCardValidityEnd(v.operationCardValidityEnd ? v.operationCardValidityEnd.substring(0, 10) : '');
    
    setDailyFee(String(v.dailyFee || 0));
    setStartShiftTime(v.startShiftTime || '05:00');
    setEndShiftTime(v.endShiftTime || '19:00');
    setSavingsAmount(String(v.savingsAmount || 0));
    setStatus(v.status);

    setDayDriverId(v.driverId || '');
    setDayFee(String(v.dailyFee || 110000));
    setDaySavings(String(v.savingsAmount || 10000));

    setNightDriverId('');
    setNightFee(String(v.dailyFee || 110000));
    setNightSavings(String(v.savingsAmount || 10000));

    adminService.fetchVehiculoTurnos(v.id).then((turnos: any[]) => {
      const day = turnos.find((t) => t.shift === 'dia');
      const night = turnos.find((t) => t.shift === 'noche');

      if (day) {
        setDayDriverId(day.driver_id || v.driverId || '');
        setDayFee(String(day.daily_fee ?? v.dailyFee ?? 110000));
        setDaySavings(String(day.savings_amount ?? v.savingsAmount ?? 10000));
      }
      if (night) {
        setNightDriverId(night.driver_id || '');
        setNightFee(String(night.daily_fee ?? v.dailyFee ?? 110000));
        setNightSavings(String(night.savings_amount ?? v.savingsAmount ?? 10000));
      }
    });

    setShowFormModal(true);
  };


  const handleOpenViewModal = async (v: Vehiculo) => {
    setViewingVehiculo(v);
    setVehiculoRelations(null);
    const rels = await adminService.fetchVehiculoRelations(v.id);
    setVehiculoRelations(rels);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!plate.trim()) {
      setErrorMsg('La placa del vehículo es requerida.');
      return;
    }
    if (!ownerId) {
      setErrorMsg('Debe seleccionar un propietario.');
      return;
    }
    if (!servicioId) {
      setErrorMsg('Debe seleccionar un servicio de la app.');
      return;
    }

    setSaving(true);
    try {
      let savedVehiculo: Vehiculo;

      if (editingVehiculo) {
        const updateInput: UpdateVehiculoFullInput = {
          plate: plate.trim(),
          model: model.trim(),
          ownerId,
          driverId: dayDriverId || driverId || undefined,
          affiliatedCompanyId: affiliatedCompanyId || undefined,
          servicioId,
          marcaId: marcaId || undefined,
          displacement,
          fuelType,
          passengerCapacity: Number(passengerCapacity) || 4,
          serialNumber: serialNumber.trim() || undefined,
          chassisNumber: chassisNumber.trim() || undefined,
          engineNumber: engineNumber.trim() || undefined,
          color: color.trim() || undefined,
          operationCardNumber: operationCardNumber.trim() || undefined,
          operationCardExpedition: operationCardExpedition || undefined,
          operationCardValidityStart: operationCardValidityStart || undefined,
          operationCardValidityEnd: operationCardValidityEnd || undefined,
          dailyFee: Number(dayFee) || Number(dailyFee) || 0,
          startShiftTime,
          endShiftTime,
          savingsAmount: Number(daySavings) || Number(savingsAmount) || 0,
          status,
        };
        savedVehiculo = await adminService.updateVehiculoFull(editingVehiculo.id, updateInput);
      } else {
        const createInput: CreateVehiculoFullInput = {
          plate: plate.trim(),
          model: model.trim(),
          ownerId,
          driverId: dayDriverId || driverId || undefined,
          affiliatedCompanyId: affiliatedCompanyId || undefined,
          servicioId,
          marcaId: marcaId || undefined,
          displacement,
          fuelType,
          passengerCapacity: Number(passengerCapacity) || 4,
          serialNumber: serialNumber.trim() || undefined,
          chassisNumber: chassisNumber.trim() || undefined,
          engineNumber: engineNumber.trim() || undefined,
          color: color.trim() || undefined,
          operationCardNumber: operationCardNumber.trim() || undefined,
          operationCardExpedition: operationCardExpedition || undefined,
          operationCardValidityStart: operationCardValidityStart || undefined,
          operationCardValidityEnd: operationCardValidityEnd || undefined,
          dailyFee: Number(dayFee) || Number(dailyFee) || 0,
          startShiftTime,
          endShiftTime,
          savingsAmount: Number(daySavings) || Number(savingsAmount) || 0,
          status,
        };
        savedVehiculo = await adminService.createVehiculoFull(createInput);
      }

      // Guardar Configuración de Turno Día y Turno Noche en vehiculo_turnos
      await Promise.all([
        adminService.saveVehiculoShift({
          vehiculoId: savedVehiculo.id,
          shift: 'dia',
          driverId: dayDriverId || undefined,
          dailyFee: Number(dayFee) || 0,
          savingsAmount: Number(daySavings) || 0,
          startTime: '05:00',
          endTime: '19:00',
        }),
        adminService.saveVehiculoShift({
          vehiculoId: savedVehiculo.id,
          shift: 'noche',
          driverId: nightDriverId || undefined,
          dailyFee: Number(nightFee) || 0,
          savingsAmount: Number(nightSavings) || 0,
          startTime: '19:00',
          endTime: '05:00',
        }),
      ]);

      setShowFormModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el vehículo y sus turnos.');
    } finally {
      setSaving(false);
    }

  };

  const handleDeleteVehiculo = async (v: Vehiculo) => {
    if (!window.confirm(`¿Desea eliminar el taxi ${v.plate}?`)) return;

    try {
      await adminService.deleteVehiculoSafe(v.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el vehículo.');
    }
  };

  // Listas filtradas de terceros según rol
  const ownersList = terceros.filter((t) => t.isOwner);
  const driversList = terceros.filter((t) => t.isDriver);
  const selectedDriver = driversList.find((d) => d.id === driverId);

  // Evaluación de vigencia Tarjeta de Operación
  const getOperationCardStatus = (v: Vehiculo) => {
    if (!v.operationCardValidityEnd) return { label: 'SIN TARJETA', color: '#64748b' };
    const now = new Date();
    const endDate = new Date(v.operationCardValidityEnd);
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) return { label: 'VENCIDA', color: '#ef4444' };
    if (diffDays <= 30) return { label: 'PRÓXIMA A VENCER', color: '#f59e0b' };
    return { label: 'VIGENTE', color: '#10b981' };
  };

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car color="var(--primary)" />
            <span>Maestro de Vehículos / Taxis</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Gestiona la flota de taxis, asignaciones de conductores, tarjetas de operación e integración GPS.
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
              padding: '0.5.rem 1rem',
              borderRadius: '6px',
              fontWeight: '800',
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            <span>Registrar Vehículo</span>
          </button>
        </div>
      </div>

      {/* Bar: Search & Status Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por placa..."
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              paddingTop: '0.6rem',
              paddingBottom: '0.6rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.875rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {[
            { id: '', label: 'Todos' },
            { id: 'disponible', label: 'Disponibles' },
            { id: 'en_servicio', label: 'En Servicio' },
            { id: 'fuera_de_servicio', label: 'Fuera Servicio' },
            { id: 'sin_conexion', label: 'Sin Conexión' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === f.id ? 'var(--primary)' : 'transparent',
                color: statusFilter === f.id ? 'var(--bg-dark)' : 'var(--text-secondary)',
                fontWeight: statusFilter === f.id ? '800' : '500',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Vehículos */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando vehículos de la flota...</div>
        ) : vehiculos.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No se encontraron vehículos registrados.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-dark)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Placa / Marca</th>
                <th style={{ padding: '0.75rem 1rem' }}>Propietario</th>
                <th style={{ padding: '0.75rem 1rem' }}>Conductor Asignado</th>
                <th style={{ padding: '0.75rem 1rem' }}>Tarjeta Operación</th>
                <th style={{ padding: '0.75rem 1rem' }}>Cuota Diaria</th>
                <th style={{ padding: '0.75rem 1rem' }}>Estado Operativo</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((v) => {
                const cardBadge = getOperationCardStatus(v);
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: 'var(--primary)' }}>
                      🚕 Taxi {v.plate}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '400' }}>
                        {v.marca?.name || 'Marca S/N'} - {v.model} ({v.fuelType || 'Gasolina'})
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                      {v.owner ? v.owner.name : 'Sin Propietario'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {v.driver ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#38bdf8', fontWeight: '600' }}>
                          <UserCheck size={14} />
                          {v.driver.name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Sin conductor</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge" style={{ background: `${cardBadge.color}25`, borderColor: cardBadge.color, color: cardBadge.color }}>
                        {cardBadge.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>
                      ${v.dailyFee.toLocaleString('es-CO')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`badge ${v.status === 'en_servicio' ? 'badge-service' : 'badge-available'}`}>
                        {v.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        <button
                          onClick={() => handleOpenViewModal(v)}
                          title="Ver Ficha del Vehículo"
                          style={{ padding: '0.4rem', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(v)}
                          title="Editar Vehículo"
                          style={{ padding: '0.4rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteVehiculo(v)}
                          title="Eliminar Vehículo"
                          style={{ padding: '0.4rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Formulario Crear / Editar Vehículo */}
      {showFormModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '650px', maxWidth: '100%', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>
                {editingVehiculo ? `Editar Taxi ${editingVehiculo.plate}` : 'Registrar Nuevo Taxi / Vehículo'}
              </h3>
              <button onClick={() => setShowFormModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Sección 1: Identificación */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem' }}>
                  IDENTIFICACIÓN DEL VEHÍCULO
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Placa (Única) *</label>
                    <input
                      type="text"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value)}
                      placeholder="SMR842"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', textTransform: 'uppercase' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Modelo / Año *</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="2023"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Propiedad y Asignación de Roles */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem' }}>
                  PROPIEDAD Y ASIGNACIONES
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Propietario (is_owner = true) *</label>
                    <select
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                      required
                    >
                      <option value="">-- Seleccionar Propietario --</option>
                      {ownersList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.docNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Conductor (is_driver = true)</label>
                    <select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    >
                      <option value="">-- Sin Conductor Asignado --</option>
                      {driversList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.docNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Advertencia si la licencia del conductor está ausente o vencida */}
                {selectedDriver && (
                  <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: '4px', fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.5rem' }}>
                    <strong>Verificación de Licencia:</strong> Licencia RUNT: {selectedDriver.driverLicenseNumber || 'NO REGISTRADA'}. Vencimiento: {selectedDriver.driverLicenseExpiration ? new Date(selectedDriver.driverLicenseExpiration).toLocaleDateString() : 'NO REGISTRADA'}.
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Empresa Afiliadora (Tercero)</label>
                    <select
                      value={affiliatedCompanyId}
                      onChange={(e) => setAffiliatedCompanyId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    >
                      <option value="">-- Seleccionar Empresa --</option>
                      {terceros.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.docNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Servicio de la App *</label>
                    <select
                      value={servicioId}
                      onChange={(e) => setServicioId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                      required
                    >
                      <option value="">-- Seleccionar Servicio --</option>
                      {serviciosApp.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Nivel {s.level})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 3: Información Técnica */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem' }}>
                  INFORMACIÓN TÉCNICA Y MARCA
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Marca</label>
                    <select
                      value={marcaId}
                      onChange={(e) => setMarcaId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    >
                      <option value="">-- Sin Especificar --</option>
                      {marcas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.country || 'Global'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Cilindraje</label>
                    <input
                      type="text"
                      value={displacement}
                      onChange={(e) => setDisplacement(e.target.value)}
                      placeholder="1.2L"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Combustible</label>
                    <input
                      type="text"
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      placeholder="Gasolina/Gas"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Color</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="Amarillo"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Serie</label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="N° Serie"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Chasis</label>
                    <input
                      type="text"
                      value={chassisNumber}
                      onChange={(e) => setChassisNumber(e.target.value)}
                      placeholder="N° Chasis"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Motor</label>
                    <input
                      type="text"
                      value={engineNumber}
                      onChange={(e) => setEngineNumber(e.target.value)}
                      placeholder="N° Motor"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 4: Tarjeta de Operación */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem' }}>
                  TARJETA DE OPERACIÓN
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>N° Tarjeta</label>
                    <input
                      type="text"
                      value={operationCardNumber}
                      onChange={(e) => setOperationCardNumber(e.target.value)}
                      placeholder="N° Tarjeta"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Expedición</label>
                    <input
                      type="date"
                      value={operationCardExpedition}
                      onChange={(e) => setOperationCardExpedition(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Inicio Vigencia</label>
                    <input
                      type="date"
                      value={operationCardValidityStart}
                      onChange={(e) => setOperationCardValidityStart(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Fin Vigencia</label>
                    <input
                      type="date"
                      value={operationCardValidityEnd}
                      onChange={(e) => setOperationCardValidityEnd(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 5: Configuración de Turnos (Día / Noche) */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem' }}>
                  CONFIGURACIÓN DE TURNOS (DÍA Y NOCHE)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Turno Día */}
                  <div style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b', fontSize: '0.85rem', fontWeight: '700' }}>
                      ☀️ TURNO DÍA (05:00 - 19:00)
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Conductor Turno Día</label>
                        <select
                          value={dayDriverId}
                          onChange={(e) => setDayDriverId(e.target.value)}
                          style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                        >
                          <option value="">-- Sin Conductor --</option>
                          {driversList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.docNumber})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Cuota Día ($)</label>
                          <input
                            type="number"
                            value={dayFee}
                            onChange={(e) => setDayFee(e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Ahorro Día ($)</label>
                          <input
                            type="number"
                            value={daySavings}
                            onChange={(e) => setDaySavings(e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Turno Noche */}
                  <div style={{ padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.3)', backgroundColor: 'rgba(168, 85, 247, 0.05)' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#c084fc', fontSize: '0.85rem', fontWeight: '700' }}>
                      🌙 TURNO NOCHE (19:00 - 05:00)
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Conductor Turno Noche</label>
                        <select
                          value={nightDriverId}
                          onChange={(e) => setNightDriverId(e.target.value)}
                          style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                        >
                          <option value="">-- Sin Conductor --</option>
                          {driversList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.docNumber})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Cuota Noche ($)</label>
                          <input
                            type="number"
                            value={nightFee}
                            onChange={(e) => setNightFee(e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>Ahorro Noche ($)</label>
                          <input
                            type="number"
                            value={nightSavings}
                            onChange={(e) => setNightSavings(e.target.value)}
                            style={{ width: '100%', padding: '0.4rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Estado Operativo del Taxi</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaxiStatus)}
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  >
                    <option value="disponible">disponible</option>
                    <option value="en_servicio">en_servicio</option>
                  </select>
                </div>
              </div>

              {/* Acciones */}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '0.6rem 1.2rem', background: 'var(--primary)', border: 'none', color: 'var(--bg-dark)', borderRadius: '6px', fontWeight: '800', cursor: 'pointer' }}
                >
                  {saving ? 'Guardando...' : editingVehiculo ? 'Guardar Cambios' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha Técnica del Vehículo y Lectura GPS */}
      {viewingVehiculo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '650px', maxWidth: '100%', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                  Ficha Técnica Taxi {viewingVehiculo.plate}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {viewingVehiculo.marca?.name || 'Marca S/N'} - Modelo {viewingVehiculo.model} ({viewingVehiculo.color || 'Sin color'})
                </p>
              </div>
              <button onClick={() => setViewingVehiculo(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Información General y Propiedad */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.5rem' }}>
                  PROPIEDAD Y CONDUCTOR ASIGNADO
                </h4>
                <p style={{ fontSize: '0.875rem' }}><strong>Propietario:</strong> {viewingVehiculo.owner ? `${viewingVehiculo.owner.name} (${viewingVehiculo.owner.docNumber})` : 'Sin asignar'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Conductor Asignado:</strong> {viewingVehiculo.driver ? `${viewingVehiculo.driver.name} (${viewingVehiculo.driver.docNumber})` : 'Sin conductor'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Empresa Afiliadora:</strong> {viewingVehiculo.affiliatedCompanyId ? 'Registrada' : 'Sin afiliar'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Servicio App:</strong> {viewingVehiculo.servicio?.name || 'Suscripción Estándar'}</p>
              </div>

              {/* Información Técnica */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '0.5rem' }}>
                  ESPECIFICACIONES TÉCNICAS
                </h4>
                <p style={{ fontSize: '0.875rem' }}><strong>Cilindraje / Combustible:</strong> {viewingVehiculo.displacement || 'N/A'} - {viewingVehiculo.fuelType || 'N/A'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Número de Serie:</strong> {viewingVehiculo.serialNumber || 'N/A'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Número de Chasis:</strong> {viewingVehiculo.chassisNumber || 'N/A'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Número de Motor:</strong> {viewingVehiculo.engineNumber || 'N/A'}</p>
              </div>

              {/* Tarjeta de Operación */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '0.5rem' }}>
                  TARJETA DE OPERACIÓN Y VIGENCIA
                </h4>
                <p style={{ fontSize: '0.875rem' }}><strong>N° Tarjeta:</strong> {viewingVehiculo.operationCardNumber || 'Sin tarjeta'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  <strong>Vigencia:</strong> {viewingVehiculo.operationCardValidityStart ? new Date(viewingVehiculo.operationCardValidityStart).toLocaleDateString() : 'N/A'} al {viewingVehiculo.operationCardValidityEnd ? new Date(viewingVehiculo.operationCardValidityEnd).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              {/* Lectura GPS */}
              <div style={{ background: 'rgba(56,189,248,0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid #38bdf8' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: '800', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={16} />
                  <span>ÚLTIMA UBICACIÓN GPS REGISTRADA</span>
                </h4>
                {viewingVehiculo.lastKnownLat ? (
                  <>
                    <p style={{ fontSize: '0.875rem' }}><strong>Coordenadas:</strong> Lat {viewingVehiculo.lastKnownLat.toFixed(5)}, Lng {viewingVehiculo.lastKnownLng?.toFixed(5)}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      <strong>Último reporte:</strong> {viewingVehiculo.lastLocationAt ? new Date(viewingVehiculo.lastLocationAt).toLocaleString() : '---'}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Aún no se han recibido transmisiones GPS para este vehículo.</p>
                )}
              </div>

              {/* Registros históricos vinculados */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.5rem' }}>
                  HISTORIAL Y REGISTROS VINCULADOS
                </h4>

                {!vehiculoRelations ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cargando datos de historial...</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <p><strong>Producciones Diarias:</strong> {vehiculoRelations.produccionesCount}</p>
                    <p><strong>Mantenimientos:</strong> {vehiculoRelations.mantenimientosCount}</p>
                    <p><strong>Carreras Atendidas:</strong> {vehiculoRelations.carrerasCount}</p>
                    <p><strong>Sesiones GPS:</strong> {vehiculoRelations.trackingSessionsCount}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
