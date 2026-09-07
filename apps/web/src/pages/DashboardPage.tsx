import React, { useEffect, useState, useMemo } from 'react';
import {
  getDashboardFilterOptions,
  getDashboardFinancialSummary,
  type DashboardFinancialSummary,
  type DashboardFilterOptions,
} from '../services/dashboardService';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wrench,
  ShieldCheck,
  Users,
  Filter,
  RefreshCw,
  PieChart,
  BarChart3,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const DashboardPage: React.FC = () => {
  const [filterOptions, setFilterOptions] = useState<DashboardFilterOptions | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedVehiculo, setSelectedVehiculo] = useState<string>('todos');
  const [selectedDriver, setSelectedDriver] = useState<string>('todos');
  const [selectedEvento, setSelectedEvento] = useState<string>('todos');

  const [summary, setSummary] = useState<DashboardFinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cargar opciones de filtros iniciales
  useEffect(() => {
    getDashboardFilterOptions()
      .then((options) => {
        setFilterOptions(options);
        if (options.years.length > 0 && !options.years.includes(selectedYear)) {
          setSelectedYear(options.years[0]);
        }
      })
      .catch((err) => {
        console.error('Error cargando filtros:', err);
      });
  }, []);

  // Cargar resumen financiero cuando cambian los filtros
  const loadSummaryData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await getDashboardFinancialSummary(
        selectedYear,
        selectedVehiculo,
        selectedDriver,
        selectedEvento
      );
      setSummary(data);
    } catch (err: any) {
      console.error('Error al cargar datos del dashboard:', err);
      setErrorMessage(err.message || 'No se pudieron calcular los indicadores del dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummaryData();
  }, [selectedYear, selectedVehiculo, selectedDriver, selectedEvento]);

  // Validación matemática estricta
  const isMathValid = useMemo(() => {
    if (!summary) return true;
    const calcGastos = summary.totalControl + summary.totalMantenimiento + summary.totalLiquidacion;
    const calcNeto = summary.totalIngresos - calcGastos;
    const diffGastos = Math.abs(summary.totalGastos - calcGastos);
    const diffNeto = Math.abs(summary.totalNeto - calcNeto);
    return diffGastos < 0.01 && diffNeto < 0.01;
  }, [summary]);

  const maxMonthlyVal = useMemo(() => {
    if (!summary || summary.monthlyData.length === 0) return 1;
    const maxIng = Math.max(...summary.monthlyData.map((m) => m.ingresos));
    const maxGas = Math.max(...summary.monthlyData.map((m) => m.totalGastos));
    return Math.max(maxIng, maxGas, 1000000);
  }, [summary]);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        overflowY: 'auto',
        padding: '1.5rem',
        gap: '1.5rem',
      }}
    >
      {/* Header & Filtros */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 size={26} color="#f59e0b" />
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Dashboard Administrativo / Gerencial
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Resumen consolidado de ingresos, costos operacionales y rentabilidad neta
              </p>
            </div>
          </div>

          <button
            onClick={loadSummaryData}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: isLoading ? 'wait' : 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Actualizar Datos</span>
          </button>
        </div>

        {/* Barra de Seleccionadores de Filtro */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid #334155',
          }}
        >
          {/* Año */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
              AÑO DE EJERCICIO
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {(filterOptions?.years || [2026, 2025, 2024]).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Vehículo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
              VEHÍCULO / TAXI
            </label>
            <select
              value={selectedVehiculo}
              onChange={(e) => setSelectedVehiculo(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="todos">Todos los taxis</option>
              {(filterOptions?.vehiculos || []).map((v) => (
                <option key={v.id} value={v.id}>
                  🚕 {v.plate} {v.model ? `(${v.model})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Conductor */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
              CONDUCTOR
            </label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="todos">Todos los conductores</option>
              {(filterOptions?.conductores || []).map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Eventos de Control */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
              FILTRO CONTROL / EVENTOS
            </label>
            <select
              value={selectedEvento}
              onChange={(e) => setSelectedEvento(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              <option value="todos">Todos los eventos</option>
              {(filterOptions?.eventos || []).map((e) => (
                <option key={e.id} value={e.id}>
                  🛡️ {e.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Alertas / Inconsistencias Matemáticas (si las hubiere) */}
      {!isMathValid && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={18} />
          <span>Advertencia: Inconsistencia detectada entre totales de gastos e ingresos.</span>
        </div>
      )}

      {/* TARJETAS KPI (Indicadores Principales) */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Ingresos */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>
              <span>INGRESOS (RECAUDO)</span>
              <DollarSign size={18} color="#10b981" />
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', margin: '0.5rem 0 0 0' }}>
              {formatCurrency(summary.totalIngresos)}
            </p>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{summary.totalProduccionesCount} jornadas registradas</span>
          </div>

          {/* Gastos Control */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>
              <span>GASTOS CONTROL</span>
              <ShieldCheck size={18} color="#38bdf8" />
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', margin: '0.5rem 0 0 0' }}>
              {formatCurrency(summary.totalControl)}
            </p>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Eventos de mantenimiento preventivo</span>
          </div>

          {/* Gastos Mantenimiento */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>
              <span>MANTENIMIENTO TALLER</span>
              <Wrench size={18} color="#f59e0b" />
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', margin: '0.5rem 0 0 0' }}>
              {formatCurrency(summary.totalMantenimiento)}
            </p>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{summary.totalMantenimientosCount} mantenimientos de taller</span>
          </div>

          {/* Liquidación Conductor */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>
              <span>LIQUIDACIÓN CONDUCTOR</span>
              <Users size={18} color="#a855f7" />
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a855f7', margin: '0.5rem 0 0 0' }}>
              {formatCurrency(summary.totalLiquidacion)}
            </p>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Pagos de prestaciones/ahorro</span>
          </div>

          {/* Total Gastos */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #ef4444', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700 }}>
              <span>TOTAL GASTOS</span>
              <TrendingDown size={18} color="#ef4444" />
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', margin: '0.5rem 0 0 0' }}>
              {formatCurrency(summary.totalGastos)}
            </p>
            <span style={{ fontSize: '0.7rem', color: '#fca5a5' }}>Control + Mantenimiento + Liquidación</span>
          </div>

          {/* Neto */}
          <div style={{ backgroundColor: '#1e293b', border: summary.totalNeto >= 0 ? '1px solid #10b981' : '1px solid #ef4444', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>
              <span>UTILIDAD NETA</span>
              <TrendingUp size={18} color={summary.totalNeto >= 0 ? '#10b981' : '#ef4444'} />
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: summary.totalNeto >= 0 ? '#10b981' : '#ef4444', margin: '0.5rem 0 0 0' }}>
              {formatCurrency(summary.totalNeto)}
            </p>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Ingresos - Total Gastos</span>
          </div>

          {/* Rentabilidad */}
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>
              <span>RENTABILIDAD NETA</span>
              <PieChart size={18} color="#f59e0b" />
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b', margin: '0.5rem 0 0 0' }}>
              {summary.rentabilidadTotal != null ? `${summary.rentabilidadTotal.toFixed(1)} %` : 'N/A'}
            </p>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>(Neto / Ingresos) × 100</span>
          </div>
        </div>
      )}

      {/* GRÁFICA PRINCIPAL DE EVOLUCIÓN MENSUAL */}
      {summary && (
        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
            Evolución Mensual (Ingresos vs Gastos vs Neto)
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
            Comparativa gráfica de recaudo y egresos mes a mes en el año {selectedYear}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Leyenda */}
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '3px' }}></div>
                <span>Ingresos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '3px' }}></div>
                <span>Total Gastos</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: '#38bdf8', borderRadius: '3px' }}></div>
                <span>Neto</span>
              </div>
            </div>

            {/* SVG Visual Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.5rem', height: '220px', alignItems: 'flex-end', paddingTop: '1rem', borderBottom: '1px solid #334155' }}>
              {summary.monthlyData.map((m) => {
                const ingHeight = Math.max((m.ingresos / maxMonthlyVal) * 100, 2);
                const gasHeight = Math.max((m.totalGastos / maxMonthlyVal) * 100, 2);
                const netHeight = Math.max((Math.max(0, m.neto) / maxMonthlyVal) * 100, 2);

                return (
                  <div key={m.monthIndex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', width: '100%', height: '180px' }}>
                      <div
                        title={`Ingresos: ${formatCurrency(m.ingresos)}`}
                        style={{
                          flex: 1,
                          backgroundColor: '#10b981',
                          height: `${ingHeight}%`,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <div
                        title={`Gastos: ${formatCurrency(m.totalGastos)}`}
                        style={{
                          flex: 1,
                          backgroundColor: '#ef4444',
                          height: `${gasHeight}%`,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <div
                        title={`Neto: ${formatCurrency(m.neto)}`}
                        style={{
                          flex: 1,
                          backgroundColor: '#38bdf8',
                          height: `${netHeight}%`,
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.4rem', fontWeight: 600 }}>
                      {m.monthName.substring(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TABLA PRINCIPAL DE RESUMEN MENSUAL */}
      {summary && (
        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Resumen Financiero Mensual ({selectedYear})
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>MES</th>
                  <th style={{ padding: '0.85rem 1rem' }}>INGRESOS</th>
                  <th style={{ padding: '0.85rem 1rem' }}>CONTROL</th>
                  <th style={{ padding: '0.85rem 1rem' }}>MANTENIMIENTO</th>
                  <th style={{ padding: '0.85rem 1rem' }}>LIQUIDACIÓN</th>
                  <th style={{ padding: '0.85rem 1rem' }}>TOTAL GASTOS</th>
                  <th style={{ padding: '0.85rem 1rem' }}>NETO</th>
                  <th style={{ padding: '0.85rem 1rem' }}>RENTABILIDAD</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthlyData.map((m) => (
                  <tr key={m.monthIndex} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#f8fafc' }}>
                      {m.monthName}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#10b981', fontWeight: 600 }}>
                      {formatCurrency(m.ingresos)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>{formatCurrency(m.control)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>{formatCurrency(m.mantenimiento)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>{formatCurrency(m.liquidacion)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#ef4444', fontWeight: 600 }}>
                      {formatCurrency(m.totalGastos)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: m.neto >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {formatCurrency(m.neto)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#f59e0b', fontWeight: 600 }}>
                      {m.rentabilidad != null ? `${m.rentabilidad.toFixed(1)} %` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#0f172a', fontWeight: 800, fontSize: '0.9rem', color: '#f8fafc' }}>
                  <td style={{ padding: '1rem', textAlign: 'left' }}>TOTAL ANUAL</td>
                  <td style={{ padding: '1rem', color: '#10b981' }}>{formatCurrency(summary.totalIngresos)}</td>
                  <td style={{ padding: '1rem', color: '#38bdf8' }}>{formatCurrency(summary.totalControl)}</td>
                  <td style={{ padding: '1rem', color: '#f59e0b' }}>{formatCurrency(summary.totalMantenimiento)}</td>
                  <td style={{ padding: '1rem', color: '#a855f7' }}>{formatCurrency(summary.totalLiquidacion)}</td>
                  <td style={{ padding: '1rem', color: '#ef4444' }}>{formatCurrency(summary.totalGastos)}</td>
                  <td style={{ padding: '1rem', color: summary.totalNeto >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(summary.totalNeto)}
                  </td>
                  <td style={{ padding: '1rem', color: '#f59e0b' }}>
                    {summary.rentabilidadTotal != null ? `${summary.rentabilidadTotal.toFixed(1)} %` : 'N/A'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* DESGLOSE ESPECÍFICO DE GASTOS VARIADOS DE CONTROL */}
      {summary && summary.eventBreakdown.length > 0 && (
        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Gastos Varios — Control por Tipo de Evento
            </h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>EVENTO / CATEGORÍA REAL</th>
                  {summary.monthlyData.map((m) => (
                    <th key={m.monthIndex} style={{ padding: '0.75rem 0.5rem' }}>{m.monthName.substring(0, 3)}</th>
                  ))}
                  <th style={{ padding: '0.75rem 1rem' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {summary.eventBreakdown.map((ev) => (
                  <tr key={ev.eventoId} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#38bdf8' }}>
                      🛡️ {ev.eventoName}
                    </td>
                    {ev.monthlyValues.map((val, idx) => (
                      <td key={idx} style={{ padding: '0.75rem 0.5rem', color: val > 0 ? '#f8fafc' : '#64748b' }}>
                        {val > 0 ? formatCurrency(val) : '$0'}
                      </td>
                    ))}
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#38bdf8' }}>
                      {formatCurrency(ev.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* RESUMEN EJECUTIVO TIPO HOJA DE INFORME */}
      {summary && (
        <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={20} color="#f59e0b" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Resumen Consolidado Final ({selectedYear})
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8' }}>Ingresos Brutos:</span>
                <strong style={{ color: '#10b981' }}>{formatCurrency(summary.totalIngresos)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8' }}>(-) Gastos de Control:</span>
                <span style={{ color: '#cbd5e1' }}>{formatCurrency(summary.totalControl)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8' }}>(-) Mantenimiento Taller:</span>
                <span style={{ color: '#cbd5e1' }}>{formatCurrency(summary.totalMantenimiento)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8' }}>(-) Liquidación Conductor:</span>
                <span style={{ color: '#cbd5e1' }}>{formatCurrency(summary.totalLiquidacion)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0 0.25rem 0', fontWeight: 800 }}>
                <span style={{ color: '#ef4444' }}>TOTAL GASTOS:</span>
                <span style={{ color: '#ef4444' }}>{formatCurrency(summary.totalGastos)}</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>NETO RESULTADO:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: summary.totalNeto >= 0 ? '#10b981' : '#ef4444' }}>
                  {formatCurrency(summary.totalNeto)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 700 }}>MARGEN DE RENTABILIDAD:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
                  {summary.rentabilidadTotal != null ? `${summary.rentabilidadTotal.toFixed(2)} %` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardPage;
