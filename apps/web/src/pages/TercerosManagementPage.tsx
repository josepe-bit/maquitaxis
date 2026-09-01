import React, { useState, useEffect } from 'react';
import { adminService, CreateTerceroInput, UpdateTerceroInput, TerceroRelations } from '../services/adminService';
import { Tercero } from '@maquitaxis/shared';
import { useAuth, UserRole } from '../context/AuthContext';
import { Users, Plus, Search, Filter, ShieldCheck, Edit3, Trash2, Eye, Phone, Mail, FileText, Calendar, CheckCircle2, Car, AlertTriangle, X, Clock, UserCheck, UserX, ShieldAlert } from 'lucide-react';

export const TercerosManagementPage: React.FC = () => {
  const { approveUser, rejectUser, rol: currentRole } = useAuth();
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pendingCount, setPendingCount] = useState<number>(0);
  
  // Modals state
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingTercero, setEditingTercero] = useState<Tercero | null>(null);
  const [viewingTercero, setViewingTercero] = useState<Tercero | null>(null);
  const [approvingTercero, setApprovingTercero] = useState<Tercero | null>(null);
  const [approvedRoleSelect, setApprovedRoleSelect] = useState<UserRole>('CONDUCTOR');
  const [terceroRelations, setTerceroRelations] = useState<TerceroRelations | null>(null);
  
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [nequiNumber, setNequiNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  // Roles
  const [isOwner, setIsOwner] = useState(false);
  const [isServiceClient, setIsServiceClient] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [isSupplier, setIsSupplier] = useState(false);
  
  // Driver Fields
  const [driverLicenseNumber, setDriverLicenseNumber] = useState('');
  const [driverLicenseExpiration, setDriverLicenseExpiration] = useState('');

  useEffect(() => {
    loadTerceros();
  }, [searchQuery, roleFilter, statusFilter]);

  const loadTerceros = async () => {
    setLoading(true);
    try {
      const activeStatusFilter = statusFilter === 'all' ? undefined : statusFilter;
      const list = await adminService.fetchTerceros(searchQuery, roleFilter, activeStatusFilter);
      setTerceros(list);

      // Cargar conteo de pendientes para la pestaña
      const pendingList = await adminService.fetchTerceros('', '', 'pending');
      setPendingCount(pendingList.length);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTercero(null);
    setErrorMsg(null);
    setDocType('CC');
    setDocNumber('');
    setName('');
    setPhone('');
    setAddress('');
    setEmail('');
    setWhatsappNumber('');
    setNequiNumber('');
    setBirthDate('');
    setIsOwner(false);
    setIsServiceClient(false);
    setIsDriver(false);
    setIsSupplier(false);
    setDriverLicenseNumber('');
    setDriverLicenseExpiration('');
    setShowFormModal(true);
  };

  const handleOpenEditModal = (t: Tercero) => {
    setEditingTercero(t);
    setErrorMsg(null);
    setDocType(t.docType);
    setDocNumber(t.docNumber);
    setName(t.name);
    setPhone(t.phone || '');
    setAddress(t.address || '');
    setEmail(t.email || '');
    setWhatsappNumber(t.whatsappNumber || '');
    setNequiNumber(t.nequiNumber || '');
    setBirthDate(t.birthDate ? t.birthDate.substring(0, 10) : '');
    setIsOwner(t.isOwner);
    setIsServiceClient(t.isServiceClient);
    setIsDriver(t.isDriver);
    setIsSupplier(t.isSupplier);
    setDriverLicenseNumber(t.driverLicenseNumber || '');
    setDriverLicenseExpiration(t.driverLicenseExpiration ? t.driverLicenseExpiration.substring(0, 10) : '');
    setShowFormModal(true);
  };

  const handleOpenViewModal = async (t: Tercero) => {
    setViewingTercero(t);
    setTerceroRelations(null);
    const rels = await adminService.fetchTerceroRelations(t.id);
    setTerceroRelations(rels);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!docNumber.trim() || !name.trim()) {
      setErrorMsg('El número de documento y el nombre completo son obligatorios.');
      return;
    }

    if (isDriver && !driverLicenseNumber.trim()) {
      setErrorMsg('La licencia de conducción es obligatoria para registrar un conductor.');
      return;
    }

    setSaving(true);
    try {
      if (editingTercero) {
        const updateInput: UpdateTerceroInput = {
          docType,
          docNumber: docNumber.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          email: email.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          nequiNumber: nequiNumber.trim() || undefined,
          birthDate: birthDate || undefined,
          isOwner,
          isServiceClient,
          isDriver,
          isSupplier,
          driverLicenseNumber: driverLicenseNumber.trim() || undefined,
          driverLicenseExpiration: driverLicenseExpiration || undefined,
        };
        await adminService.updateTercero(editingTercero.id, updateInput);
      } else {
        const createInput: CreateTerceroInput = {
          docType,
          docNumber: docNumber.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          email: email.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          nequiNumber: nequiNumber.trim() || undefined,
          birthDate: birthDate || undefined,
          isOwner,
          isServiceClient,
          isDriver,
          isSupplier,
          driverLicenseNumber: driverLicenseNumber.trim() || undefined,
          driverLicenseExpiration: driverLicenseExpiration || undefined,
        };
        await adminService.createTercero(createInput);
      }

      setShowFormModal(false);
      await loadTerceros();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el formulario.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenApproveModal = (t: Tercero) => {
    let initialRole: UserRole = 'CONDUCTOR';
    if (t.isServiceClient) initialRole = 'NIVEL_2';
    if (t.isOwner) initialRole = 'NIVEL_1';

    setApprovedRoleSelect(initialRole);
    setApprovingTercero(t);
    setActionFeedback(null);
  };

  const handleConfirmApproval = async () => {
    if (!approvingTercero) return;
    setSaving(true);
    setActionFeedback(null);
    try {
      const res = await approveUser(approvingTercero.id, approvedRoleSelect);
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message || 'Usuario aprobado exitosamente.' });
        setTimeout(() => {
          setApprovingTercero(null);
          loadTerceros();
        }, 1200);
      } else {
        setActionFeedback({ type: 'error', message: res.message || 'Error al aprobar usuario.' });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err?.message || 'Ocurrió un error inesperado.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRejectUser = async (t: Tercero) => {
    if (!window.confirm(`¿Estás seguro de rechazar la solicitud de acceso para ${t.name}?`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await rejectUser(t.id);
      if (res.success) {
        loadTerceros();
      } else {
        alert(res.message || 'Error al rechazar usuario.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTercero = async (t: Tercero) => {
    if (!window.confirm(`¿Desea eliminar a ${t.name} (${t.docNumber})?`)) return;

    try {
      await adminService.deleteTerceroSafe(t.id);
      await loadTerceros();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el tercero.');
    }
  };

  const renderRoleBadges = (t: Tercero) => {
    const badges = [];
    if (t.isOwner) badges.push(<span key="owner" className="badge" style={{ background: '#f59e0b', color: '#0f172a' }}>PROPIETARIO</span>);
    if (t.isDriver) badges.push(<span key="driver" className="badge" style={{ background: '#3b82f6', color: '#fff' }}>CONDUCTOR</span>);
    if (t.isSupplier) badges.push(<span key="supplier" className="badge" style={{ background: '#8b5cf6', color: '#fff' }}>PROVEEDOR</span>);
    if (t.isServiceClient) badges.push(<span key="client" className="badge" style={{ background: '#10b981', color: '#fff' }}>CLIENTE</span>);

    if (badges.length === 0) {
      return <span className="badge" style={{ background: '#475569', color: '#cbd5e1' }}>SIN ROL</span>;
    }

    return <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>{badges}</div>;
  };

  const renderStatusBadge = (status?: string) => {
    const st = status || 'pending';
    if (st === 'approved') {
      return <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.3)' }}>APROBADO</span>;
    }
    if (st === 'rejected') {
      return <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.3)' }}>RECHAZADO</span>;
    }
    return <span style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(245, 158, 11, 0.3)' }}>PENDIENTE</span>;
  };

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users color="var(--primary)" />
            <span>Maestro de Terceros y Gestión de Roles</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Administra propietarios, conductores, clientes y solicitudes de acceso centralizados en public.terceros.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--primary)',
            color: 'var(--bg-dark)',
            border: 'none',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            fontWeight: '800',
            cursor: 'pointer',
          }}
        >
          <Plus size={18} />
          <span>Registrar Tercero</span>
        </button>
      </div>

      {/* Pestañas Principales por Estado de Acceso */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'all', label: 'Todos los Terceros', count: null },
          { id: 'pending', label: 'Solicitudes Pendientes', count: pendingCount, isWarning: pendingCount > 0 },
          { id: 'approved', label: 'Aprobados', count: null },
          { id: 'rejected', label: 'Rechazados', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1rem',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: statusFilter === tab.id ? 'var(--bg-card)' : 'transparent',
              color: statusFilter === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: statusFilter === tab.id ? '800' : '500',
              borderBottom: statusFilter === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  backgroundColor: tab.isWarning ? '#f59e0b' : 'rgba(148, 163, 184, 0.2)',
                  color: tab.isWarning ? '#0f172a' : 'var(--text-secondary)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bar: Search & Role Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cédula, NIT, nombre, teléfono o email..."
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

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-card)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          {[
            { id: '', label: 'Todos los Roles' },
            { id: 'owner', label: 'Propietarios' },
            { id: 'driver', label: 'Conductores' },
            { id: 'supplier', label: 'Proveedores' },
            { id: 'client', label: 'Clientes' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setRoleFilter(f.id)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: 'none',
                background: roleFilter === f.id ? 'var(--primary)' : 'transparent',
                color: roleFilter === f.id ? 'var(--bg-dark)' : 'var(--text-secondary)',
                fontWeight: roleFilter === f.id ? '800' : '500',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Terceros */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando registros de terceros...</div>
        ) : terceros.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {statusFilter === 'pending'
              ? 'No hay solicitudes de acceso pendientes de aprobación en este momento.'
              : 'No se encontraron terceros con los criterios seleccionados.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-dark)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Documento</th>
                <th style={{ padding: '0.75rem 1rem' }}>Nombre / Razón Social</th>
                <th style={{ padding: '0.75rem 1rem' }}>Contacto</th>
                <th style={{ padding: '0.75rem 1rem' }}>Rol Solicitado / Asignado</th>
                <th style={{ padding: '0.75rem 1rem' }}>Estado Acceso</th>
                <th style={{ padding: '0.75rem 1rem' }}>Fecha Registro</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {terceros.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: 'var(--primary)' }}>
                    {t.docType} {t.docNumber}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                    {t.name}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    <div>{t.phone || 'Sin tel'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)' }}>{t.email || ''}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {renderRoleBadges(t)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {renderStatusBadge(t.accessStatus)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      {currentRole === 'NIVEL_1' && (t.accessStatus === 'pending' || t.accessStatus === 'rejected') && (
                        <button
                          onClick={() => handleOpenApproveModal(t)}
                          title="Aprobar Acceso de Usuario"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.7rem',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                          }}
                        >
                          <UserCheck size={15} />
                          <span>Aprobar</span>
                        </button>
                      )}

                      {currentRole === 'NIVEL_1' && t.accessStatus === 'pending' && (
                        <button
                          onClick={() => handleRejectUser(t)}
                          title="Rechazar Solicitud"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.4rem 0.6rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                          }}
                        >
                          <UserX size={15} />
                          <span>Rechazar</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenViewModal(t)}
                        title="Ver Ficha Completa"
                        style={{ padding: '0.4rem', background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(t)}
                        title="Editar Tercero"
                        style={{ padding: '0.4rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTercero(t)}
                        title="Eliminar Tercero"
                        style={{ padding: '0.4rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Formulario Crear/Editar */}
      {showFormModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '600px', maxWidth: '100%', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>
                {editingTercero ? 'Editar Registro de Tercero' : 'Registrar Nuevo Tercero'}
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
              {/* Sección 1: Datos de Identificación */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  DATOS DE IDENTIFICACIÓN
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Tipo Doc *</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    >
                      <option value="CC">CC (Cédula de Ciudadanía)</option>
                      <option value="NIT">NIT (Empresa / Persona)</option>
                      <option value="CE">CE (Cédula de Extranjería)</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Número de Documento *</label>
                    <input
                      type="text"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      placeholder="Ej: 85412369"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nombre Completo / Razón Social *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Jose Omar Conductor"
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    required
                  />
                </div>
              </div>

              {/* Sección 2: Asignación de Roles Múltiples */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  ROLES Y ASIGNACIÓN MULTI-ROL
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isOwner} onChange={(e) => setIsOwner(e.target.checked)} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Propietario (is_owner)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isDriver} onChange={(e) => setIsDriver(e.target.checked)} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#38bdf8' }}>Conductor (is_driver)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isSupplier} onChange={(e) => setIsSupplier(e.target.checked)} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Proveedor (is_supplier)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isServiceClient} onChange={(e) => setIsServiceClient(e.target.checked)} />
                    <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Cliente Servicio (is_service_client)</span>
                  </label>
                </div>
              </div>

              {/* Sección 3: Datos Especiales para Conductor */}
              {isDriver && (
                <div style={{ background: 'rgba(56,189,248,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid #38bdf8' }}>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: '800', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    DATOS REQUERIDOS DE CONDUCTOR
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Licencia de Conducción *</label>
                      <input
                        type="text"
                        value={driverLicenseNumber}
                        onChange={(e) => setDriverLicenseNumber(e.target.value)}
                        placeholder="Número de Licencia RUNT"
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                        required={isDriver}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Vencimiento Licencia</label>
                      <input
                        type="date"
                        value={driverLicenseExpiration}
                        onChange={(e) => setDriverLicenseExpiration(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Sección 4: Datos de Contacto y Personales */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                  CONTACTO Y DATOS COMPLEMENTARIOS
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Teléfono Móvil</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+57 300 123 4567"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Correo Electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="conductor@maquitaxis.com"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>WhatsApp</label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="3001234567"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nequi</label>
                    <input
                      type="text"
                      value={nequiNumber}
                      onChange={(e) => setNequiNumber(e.target.value)}
                      placeholder="3001234567"
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nacimiento</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Dirección de Residencia / Empresa</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle 15 # 4-20 Santa Marta"
                    style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-main)' }}
                  />
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
                  {saving ? 'Guardando...' : editingTercero ? 'Guardar Cambios' : 'Crear Tercero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ficha de Detalle y Relaciones Históricas */}
      {viewingTercero && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', width: '650px', maxWidth: '100%', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                  {viewingTercero.name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {viewingTercero.docType} {viewingTercero.docNumber}
                </p>
              </div>
              <button onClick={() => setViewingTercero(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Roles Badges */}
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Roles Asignados</span>
                {renderRoleBadges(viewingTercero)}
              </div>

              {/* Ficha Conductor si is_driver */}
              {viewingTercero.isDriver && (
                <div style={{ background: 'rgba(56,189,248,0.08)', padding: '1rem', borderRadius: '8px', border: '1px solid #38bdf8' }}>
                  <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#38bdf8', fontWeight: '800', marginBottom: '0.5rem' }}>
                    Ficha Técnica de Conductor
                  </h4>
                  <p style={{ fontSize: '0.875rem' }}><strong>Licencia RUNT:</strong> {viewingTercero.driverLicenseNumber || 'Sin información'}</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    <strong>Vencimiento:</strong> {viewingTercero.driverLicenseExpiration ? new Date(viewingTercero.driverLicenseExpiration).toLocaleDateString() : 'Sin fecha'}
                  </p>
                </div>
              )}

              {/* Datos de Contacto */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '800', marginBottom: '0.5rem' }}>
                  Contacto y Residencia
                </h4>
                <p style={{ fontSize: '0.875rem' }}><strong>Teléfono:</strong> {viewingTercero.phone || 'N/A'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Email:</strong> {viewingTercero.email || 'N/A'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Dirección:</strong> {viewingTercero.address || 'N/A'}</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}><strong>Nequi:</strong> {viewingTercero.nequiNumber || 'N/A'} | <strong>WhatsApp:</strong> {viewingTercero.whatsappNumber || 'N/A'}</p>
              </div>

              {/* Relaciones Relacionales Registradas */}
              <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: '800', marginBottom: '0.75rem' }}>
                  REGISTROS VINCULADOS EN EL SISTEMA
                </h4>

                {!terceroRelations ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cargando relaciones del tercero...</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <p><strong>Taxis en Propiedad (owner_id):</strong> {terceroRelations.ownedVehicles.length > 0 ? terceroRelations.ownedVehicles.map(v => v.plate).join(', ') : 'Ninguno'}</p>
                    <p><strong>Taxi Asignado como Conductor (driver_id):</strong> {terceroRelations.assignedVehicles.length > 0 ? terceroRelations.assignedVehicles.map(v => v.plate).join(', ') : 'Ninguno'}</p>
                    <p><strong>Mantenimientos registrados como Proveedor:</strong> {terceroRelations.mantenimientosCount}</p>
                    <p><strong>Carreras y viajes atendidos:</strong> {terceroRelations.carrerasCount}</p>
                    <p><strong>Sesiones GPS registradas:</strong> {terceroRelations.trackingSessionsCount}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aprobar Solicitud con Selección de Rol */}
      {approvingTercero && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.75rem', maxWidth: '480px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                <UserCheck size={22} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                  Aprobar Solicitud de Acceso
                </h3>
              </div>
              <button onClick={() => setApprovingTercero(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 0.4rem 0', color: '#f8fafc', fontWeight: '700' }}>{approvingTercero.name}</p>
              <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8' }}>Doc: {approvingTercero.docType} {approvingTercero.docNumber}</p>
              <p style={{ margin: '0 0 0.25rem 0', color: '#94a3b8' }}>Email: {approvingTercero.email || 'Sin correo'}</p>
              <p style={{ margin: 0, color: '#94a3b8' }}>Teléfono: {approvingTercero.phone || 'Sin teléfono'}</p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#f8fafc', display: 'block', marginBottom: '0.5rem' }}>
                Seleccionar Rol Aprobado Definitivo: <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={approvedRoleSelect}
                onChange={(e) => setApprovedRoleSelect(e.target.value as UserRole)}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                }}
              >
                <option value="CONDUCTOR">🚖 Conductor Operativo (Acceso a Carreras, GPS y Producción)</option>
                <option value="NIVEL_2">🏢 Gestor de Flota — Nivel 2 (Gestión de Taxis, Mantenimiento y Liquidación)</option>
                <option value="NIVEL_1">🛡️ Administrador — Nivel 1 (SuperAdmin y Control Total de Plataforma)</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', lineHeight: '1.4' }}>
                {approvedRoleSelect === 'CONDUCTOR' && '• Otorga acceso exclusivo a la aplicación móvil/web de conductor. No crea registro en la tabla de servicios.'}
                {approvedRoleSelect === 'NIVEL_2' && '• Otorga acceso a la administración de la flota acotada por su servicio de suscripción.'}
                {approvedRoleSelect === 'NIVEL_1' && '• Otorga acceso administrativo global a todos los módulos y aprobación de usuarios.'}
              </p>
            </div>

            {actionFeedback && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                  backgroundColor: actionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: actionFeedback.type === 'success' ? '#10b981' : '#ef4444',
                  border: actionFeedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                {actionFeedback.message}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setApprovingTercero(null)}
                disabled={saving}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={saving}
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                {saving ? 'Aprobando...' : 'Confirmar Aprobación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
