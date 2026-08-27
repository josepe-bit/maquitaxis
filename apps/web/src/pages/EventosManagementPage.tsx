import React, { useState, useEffect } from 'react';
import { eventoService } from '../services/eventoService';
import { EventoWithStats, CreateEventoInput, UpdateEventoInput, EventoAppliesBy } from '@maquitaxis/shared';
import {
  Wrench,
  Plus,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Gauge,
  DollarSign,
  Droplets,
  Zap,
  Disc,
  Shield,
  Calendar,
  Layers,
  HelpCircle,
  Clock,
} from 'lucide-react';

export const EventosManagementPage: React.FC = () => {
  const [eventos, setEventos] = useState<EventoWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State para Crear / Editar
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingEvento, setEditingEvento] = useState<EventoWithStats | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos del formulario
  const [name, setName] = useState<string>('');
  const [appliesBy, setAppliesBy] = useState<EventoAppliesBy>('kilometros');
  const [kmsInterval, setKmsInterval] = useState<string>('5000');
  const [monthsInterval, setMonthsInterval] = useState<string>('6');
  const [estimatedValue, setEstimatedValue] = useState<string>('150000');

  // Modal de confirmación de eliminación
  const [deletingEvento, setDeletingEvento] = useState<EventoWithStats | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Estado de siembra de plantillas
  const [seeding, setSeeding] = useState<boolean>(false);

  useEffect(() => {
    loadEventos();
  }, []);

  const loadEventos = async () => {
    setLoading(true);
    try {
      const data = await eventoService.fetchEventosWithStats();
      setEventos(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al cargar el catálogo de eventos.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingEvento(null);
    setName('');
    setAppliesBy('kilometros');
    setKmsInterval('5000');
    setMonthsInterval('6');
    setEstimatedValue('150000');
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (e: EventoWithStats) => {
    setEditingEvento(e);
    setName(e.name);
    setAppliesBy(e.appliesBy || 'kilometros');
    setKmsInterval(e.kmsInterval ? e.kmsInterval.toString() : '0');
    setMonthsInterval(e.monthsInterval ? e.monthsInterval.toString() : '0');
    setEstimatedValue(e.estimatedValue ? e.estimatedValue.toString() : '0');
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('El nombre del evento es obligatorio.');
      return;
    }

    let kms = 0;
    if (appliesBy === 'kilometros' || appliesBy === 'kilometros_y_meses') {
      kms = parseInt(kmsInterval, 10);
      if (isNaN(kms) || kms < 0) {
        setFormError('El intervalo en kilómetros debe ser un número válido mayor o igual a 0.');
        return;
      }
    }

    let months = 0;
    if (appliesBy === 'meses' || appliesBy === 'kilometros_y_meses') {
      months = parseInt(monthsInterval, 10);
      if (isNaN(months) || months < 0) {
        setFormError('El intervalo en meses debe ser un número entero válido mayor o igual a 0.');
        return;
      }
    }

    const val = parseFloat(estimatedValue);
    if (isNaN(val) || val < 0) {
      setFormError('El valor estimado debe ser un monto numérico válido.');
      return;
    }

    setSaving(true);
    try {
      if (editingEvento) {
        const updateInput: UpdateEventoInput = {
          name: name.trim(),
          appliesBy,
          kmsInterval: kms,
          monthsInterval: months,
          estimatedValue: val,
        };
        await eventoService.updateEvento(editingEvento.id, updateInput);
        setFeedback({ type: 'success', message: `Evento "${name.trim()}" actualizado exitosamente.` });
      } else {
        const createInput: CreateEventoInput = {
          name: name.trim(),
          appliesBy,
          kmsInterval: kms,
          monthsInterval: months,
          estimatedValue: val,
        };
        await eventoService.createEvento(createInput);
        setFeedback({ type: 'success', message: `Evento "${name.trim()}" registrado en el catálogo.` });
      }
      setShowModal(false);
      await loadEventos();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvento = async () => {
    if (!deletingEvento) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await eventoService.deleteEvento(deletingEvento.id);
      setFeedback({ type: 'success', message: `Evento "${deletingEvento.name}" eliminado del catálogo.` });
      setDeletingEvento(null);
      await loadEventos();
    } catch (err: any) {
      setDeleteError(err.message || 'Error al eliminar el evento.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSeedTemplates = async () => {
    setSeeding(true);
    try {
      const added = await eventoService.seedDefaultEventos();
      if (added > 0) {
        setFeedback({ type: 'success', message: `Se han agregado ${added} eventos predefinidos al catálogo.` });
      } else {
        setFeedback({ type: 'error', message: 'Los eventos predefinidos ya se encontraban registrados.' });
      }
      await loadEventos();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'No se pudieron cargar las plantillas sugeridas.' });
    } finally {
      setSeeding(false);
    }
  };

  // Filtrar eventos por búsqueda
  const filteredEventos = eventos.filter((ev) =>
    ev.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  // Métricas calculadas
  const totalEventos = eventos.length;
  const countKm = eventos.filter((e) => e.appliesBy === 'kilometros').length;
  const countMeses = eventos.filter((e) => e.appliesBy === 'meses').length;
  const countKmYMeses = eventos.filter((e) => e.appliesBy === 'kilometros_y_meses').length;
  const countNinguno = eventos.filter((e) => e.appliesBy === 'ninguno').length;

  const avgValue =
    totalEventos > 0
      ? Math.round(eventos.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0) / totalEventos)
      : 0;

  // Icono dinámico según el nombre del evento
  const getEventIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('aceite') || lower.includes('filtro')) return <Droplets size={20} color="#38bdf8" />;
    if (lower.includes('correa') || lower.includes('tiempo')) return <RefreshCw size={20} color="#f59e0b" />;
    if (lower.includes('llanta') || lower.includes('rotación')) return <Disc size={20} color="#a855f7" />;
    if (lower.includes('bujía') || lower.includes('encendido')) return <Zap size={20} color="#eab308" />;
    if (lower.includes('freno') || lower.includes('pastilla')) return <Shield size={20} color="#ef4444" />;
    if (lower.includes('tecnomecánica') || lower.includes('soat') || lower.includes('revisión'))
      return <Calendar size={20} color="#10b981" />;
    return <Wrench size={20} color="#6366f1" />;
  };

  // Formateador de moneda en pesos colombianos
  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Renderizado del badge del criterio de aplicación
  const renderAppliesBadge = (appliesBy: EventoAppliesBy) => {
    switch (appliesBy) {
      case 'kilometros':
        return (
          <span
            style={{
              fontSize: '0.725rem',
              fontWeight: '700',
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Gauge size={13} /> Por Kilómetros
          </span>
        );
      case 'meses':
        return (
          <span
            style={{
              fontSize: '0.725rem',
              fontWeight: '700',
              color: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Calendar size={13} /> Por Meses
          </span>
        );
      case 'kilometros_y_meses':
        return (
          <span
            style={{
              fontSize: '0.725rem',
              fontWeight: '700',
              color: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Layers size={13} /> Km y Meses
          </span>
        );
      case 'ninguno':
      default:
        return (
          <span
            style={{
              fontSize: '0.725rem',
              fontWeight: '600',
              color: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.12)',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <HelpCircle size={13} /> Eventual / Ninguno
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '1.5rem', width: '100%', height: '100%', overflowY: 'auto', background: 'var(--bg-dark)' }}>
      {/* Header de la vista */}
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
              Catálogo de Eventos del Vehículo
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
            Catálogo de control de mantenimiento preventivo y legal del automóvil (por kilómetros, tiempo en meses, o ambos).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSeedTemplates}
            disabled={seeding}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              color: '#38bdf8',
              fontWeight: '600',
              cursor: seeding ? 'wait' : 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
            }}
          >
            <Sparkles size={16} />
            <span>{seeding ? 'Cargando...' : 'Cargar Plantillas Sugeridas'}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.25rem',
              backgroundColor: 'var(--primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--bg-dark)',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
              transition: 'all 0.2s',
            }}
          >
            <Plus size={18} />
            <span>Nuevo Evento</span>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              Total Eventos
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <Wrench size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {totalEventos}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Mantenimientos en catálogo
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
              Por Kilómetros
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Gauge size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {countKm}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Solo por kilometraje
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
              Por Meses / Tiempo
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Calendar size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981', marginTop: '0.5rem', margin: 0 }}>
            {countMeses}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Solo por tiempo en meses
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
              Km & Meses / Mixtos
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <Layers size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {countKmYMeses}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Aplica por km o meses
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
              Costo Promedio
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#a855f7',
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.5rem', margin: 0 }}>
            {formatCurrency(avgValue)}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', margin: 0 }}>
            Estimación por evento
          </p>
        </div>
      </div>

      {/* Barra de Filtro y Búsqueda */}
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
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }}
          />
          <input
            type="text"
            placeholder="Buscar por evento (ej: aceite, tecnomecánica, soat, correa)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.6rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
        </div>

        <button
          onClick={loadEventos}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.65rem 1rem',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
          <span>Refrescar</span>
        </button>
      </div>

      {/* Lista de Eventos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Cargando catálogo de eventos...</p>
        </div>
      ) : filteredEventos.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px border var(--border-color)',
          }}
        >
          <Wrench size={48} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            No se encontraron eventos
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {searchTerm
              ? `No hay ningún evento registrado que coincida con "${searchTerm}".`
              : 'El catálogo de eventos de mantenimiento aún está vacío.'}
          </p>
          {!searchTerm && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={handleSeedTemplates}
                style={{
                  padding: '0.6rem 1.2rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cargar Plantillas Sugeridas
              </button>
              <button
                onClick={handleOpenCreateModal}
                style={{
                  padding: '0.6rem 1.2rem',
                  backgroundColor: 'var(--primary)',
                  border: 'none',
                  color: 'var(--bg-dark)',
                  borderRadius: '8px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Crear Primer Evento
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredEventos.map((ev) => {
            return (
              <div
                key={ev.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, border-color 0.2s',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {getEventIcon(ev.name)}
                      </div>
                      <div>
                        <h3
                          style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            margin: 0,
                            lineHeight: '1.3',
                          }}
                        >
                          {ev.name}
                        </h3>
                        <div style={{ marginTop: '0.25rem' }}>
                          {renderAppliesBadge(ev.appliesBy || 'kilometros')}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={() => handleOpenEditModal(ev)}
                        title="Editar Evento"
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
                        onClick={() => setDeletingEvento(ev)}
                        title="Eliminar Evento"
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
                  </div>

                  {/* Bloque Informativo de Frecuencias y Costo */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      padding: '0.85rem',
                      backgroundColor: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {(ev.appliesBy === 'kilometros' || ev.appliesBy === 'kilometros_y_meses') && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Gauge size={14} color="#38bdf8" /> Kilómetros:
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#38bdf8' }}>
                          Cada {(ev.kmsInterval || 0).toLocaleString()} km
                        </span>
                      </div>
                    )}

                    {(ev.appliesBy === 'meses' || ev.appliesBy === 'kilometros_y_meses') && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={14} color="#10b981" /> Tiempo / Meses:
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#10b981' }}>
                          Cada {ev.monthsInterval || 0} {ev.monthsInterval === 1 ? 'mes' : 'meses'}
                        </span>
                      </div>
                    )}

                    {ev.appliesBy === 'ninguno' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Periodicidad:</span>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No requiere intervalo fijo
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed rgba(255, 255, 255, 0.08)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Costo Estimado:</span>
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>
                        {formatCurrency(ev.estimatedValue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>Mantenimientos ejecutados:</span>
                  <span
                    style={{
                      fontWeight: '700',
                      color: ev.controlsCount > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {ev.controlsCount} en taxis
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Crear / Editar Evento */}
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
              maxWidth: '540px',
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
                <Wrench size={20} color="var(--primary)" />
                <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {editingEvento ? 'Editar Evento de Vehículo' : 'Registrar Nuevo Evento'}
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
                {/* Nombre del Evento */}
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
                    Nombre del Evento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cambio de Aceite, Tecnomecánica, SOAT, Cambio de Correa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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

                {/* Selección de Criterio: Aplica por */}
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
                    ¿Cómo aplica la periodicidad del evento? *
                  </label>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.6rem',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setAppliesBy('kilometros')}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: appliesBy === 'kilometros' ? '1px solid #38bdf8' : '1px solid var(--border-color)',
                        backgroundColor: appliesBy === 'kilometros' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-dark)',
                        color: appliesBy === 'kilometros' ? '#38bdf8' : 'var(--text-secondary)',
                        fontWeight: appliesBy === 'kilometros' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      <Gauge size={16} /> Por Kilómetros
                    </button>

                    <button
                      type="button"
                      onClick={() => setAppliesBy('meses')}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: appliesBy === 'meses' ? '1px solid #10b981' : '1px solid var(--border-color)',
                        backgroundColor: appliesBy === 'meses' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-dark)',
                        color: appliesBy === 'meses' ? '#34d399' : 'var(--text-secondary)',
                        fontWeight: appliesBy === 'meses' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      <Calendar size={16} /> Por Meses
                    </button>

                    <button
                      type="button"
                      onClick={() => setAppliesBy('kilometros_y_meses')}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: appliesBy === 'kilometros_y_meses' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                        backgroundColor: appliesBy === 'kilometros_y_meses' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-dark)',
                        color: appliesBy === 'kilometros_y_meses' ? '#fbbf24' : 'var(--text-secondary)',
                        fontWeight: appliesBy === 'kilometros_y_meses' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      <Layers size={16} /> Por Km y Meses
                    </button>

                    <button
                      type="button"
                      onClick={() => setAppliesBy('ninguno')}
                      style={{
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        border: appliesBy === 'ninguno' ? '1px solid #94a3b8' : '1px solid var(--border-color)',
                        backgroundColor: appliesBy === 'ninguno' ? 'rgba(148, 163, 184, 0.15)' : 'var(--bg-dark)',
                        color: appliesBy === 'ninguno' ? '#f1f5f9' : 'var(--text-secondary)',
                        fontWeight: appliesBy === 'ninguno' ? '700' : '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                      }}
                    >
                      <HelpCircle size={16} /> Ninguno
                    </button>
                  </div>
                </div>

                {/* Entrada Kilómetros (si aplica) */}
                {(appliesBy === 'kilometros' || appliesBy === 'kilometros_y_meses') && (
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
                      Número de Kilómetros *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="500"
                      placeholder="Ej: 5000 (Cambiar cada 5,000 km)"
                      value={kmsInterval}
                      onChange={(e) => setKmsInterval(e.target.value)}
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                      Cada cuántos kilómetros recorridos se debe realizar este evento.
                    </span>
                  </div>
                )}

                {/* Entrada Meses (si aplica) */}
                {(appliesBy === 'meses' || appliesBy === 'kilometros_y_meses') && (
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
                      Número de Meses *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      placeholder="Ej: 12 (Cada 12 meses)"
                      value={monthsInterval}
                      onChange={(e) => setMonthsInterval(e.target.value)}
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>
                      Cada cuántos meses debe realizarse este evento (ej: Tecnomecánica cada 12 meses).
                    </span>
                  </div>
                )}

                {/* Nota informativa si es ninguno */}
                {appliesBy === 'ninguno' && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(148, 163, 184, 0.08)',
                      border: '1px dashed var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                    }}
                  >
                    💡 Este evento se manejará de forma eventual u ocasional sin un contador de kilometraje o meses predeterminado.
                  </div>
                )}

                {/* Valor Estimado */}
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
                    Valor Estimado del Evento (COP) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1000"
                    placeholder="Ej: 150000 o 260000"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
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
                  {saving ? 'Guardando...' : editingEvento ? 'Guardar Cambios' : 'Registrar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación */}
      {deletingEvento && (
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
              ¿Eliminar evento del catálogo?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              ¿Estás seguro de que deseas eliminar la plantilla del evento <strong>"{deletingEvento.name}"</strong>? Esta acción no se puede deshacer.
            </p>

            {deleteError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  textAlign: 'left',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeletingEvento(null)}
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
                onClick={handleDeleteEvento}
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
                {deleting ? 'Eliminando...' : 'Sí, Eliminar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
