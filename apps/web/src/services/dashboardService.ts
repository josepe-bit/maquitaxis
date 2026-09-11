import { supabase } from './supabase';

export interface MonthlyFinancialRecord {
  monthIndex: number; // 0 = Enero, 11 = Diciembre
  monthName: string;
  ingresos: number;
  control: number;
  mantenimiento: number;
  liquidacion: number;
  totalGastos: number;
  neto: number;
  rentabilidad: number | null; // porcentaje o null si ingresos <= 0
}

export interface EventControlBreakdown {
  eventoId: string;
  eventoName: string;
  monthlyValues: number[]; // 12 posiciones
  total: number;
}

export interface DashboardFinancialSummary {
  year: number;
  selectedVehiculoId: string;
  selectedDriverId: string;
  selectedEventoId: string;

  // KPI Totales
  totalIngresos: number;
  totalControl: number;
  totalMantenimiento: number;
  totalLiquidacion: number;
  totalGastos: number;
  totalNeto: number;
  rentabilidadTotal: number | null;

  // Detalle mensual (12 meses)
  monthlyData: MonthlyFinancialRecord[];

  // Desglose de Gastos por Evento (Control)
  eventBreakdown: EventControlBreakdown[];

  // Conteos
  totalMantenimientosCount: number;
  totalProduccionesCount: number;
}

export interface DashboardFilterOptions {
  years: number[];
  vehiculos: { id: string; plate: string; model?: string; driverId?: string; driverName?: string }[];
  conductores: { id: string; name: string; docNumber?: string }[];
  eventos: { id: string; name: string }[];
}

/**
 * Carga las opciones de filtros disponibles desde los datos reales de Supabase.
 */
export async function getDashboardFilterOptions(): Promise<DashboardFilterOptions> {
  // 1. Cargar Vehículos
  const { data: vehiculosData } = await supabase
    .from('vehiculos')
    .select(`
      id,
      plate,
      model,
      driver_id,
      driver:terceros!vehiculos_driver_id_fkey (
        id,
        name
      )
    `)
    .order('plate', { ascending: true });

  const vehiculos = (vehiculosData || []).map((v: any) => ({
    id: v.id,
    plate: v.plate,
    model: v.model || undefined,
    driverId: v.driver_id || undefined,
    driverName: v.driver?.name || undefined,
  }));

  // 2. Cargar Conductores (is_driver = true)
  const { data: conductoresData } = await supabase
    .from('terceros')
    .select('id, name, doc_number')
    .eq('is_driver', true)
    .order('name', { ascending: true });

  const conductores = (conductoresData || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    docNumber: c.doc_number || undefined,
  }));

  // 3. Cargar Catálogo de Eventos
  const { data: eventosData } = await supabase
    .from('eventos')
    .select('id, name')
    .order('name', { ascending: true });

  const eventos = (eventosData || []).map((e: any) => ({
    id: e.id,
    name: e.name,
  }));

  // 4. Años disponibles (por defecto 2026, 2025, 2024)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  return {
    years,
    vehiculos,
    conductores,
    eventos,
  };
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Consulta y calcula el resumen financiero para el Dashboard
 */
export async function getDashboardFinancialSummary(
  year: number,
  vehiculoId: string = 'todos',
  driverId: string = 'todos',
  eventoId: string = 'todos'
): Promise<DashboardFinancialSummary> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  // 1. Consultar Registros de Producción (Ingresos)
  let produccionQuery = supabase
    .from('produccion')
    .select('id, vehiculo_id, driver_id, date, amount, deduction, status')
    .gte('date', startDate)
    .lte('date', endDate);

  if (vehiculoId !== 'todos') {
    produccionQuery = produccionQuery.eq('vehiculo_id', vehiculoId);
  }
  if (driverId !== 'todos') {
    produccionQuery = produccionQuery.eq('driver_id', driverId);
  }

  const { data: producciones } = await produccionQuery;

  // 2. Consultar Registros de Control (Gastos Control/Eventos)
  let controlQuery = supabase
    .from('control')
    .select(`
      id,
      date,
      vehiculo_id,
      evento_id,
      total_value,
      evento:eventos (
        id,
        name
      ),
      vehiculo:vehiculos (
        driver_id
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (vehiculoId !== 'todos') {
    controlQuery = controlQuery.eq('vehiculo_id', vehiculoId);
  }
  if (eventoId !== 'todos') {
    controlQuery = controlQuery.eq('evento_id', eventoId);
  }

  const { data: controles } = await controlQuery;

  // Filtrado de control por conductor si aplica
  let filteredControles = controles || [];
  if (driverId !== 'todos') {
    filteredControles = filteredControles.filter(
      (c: any) => c.vehiculo?.driver_id === driverId
    );
  }

  // 3. Consultar Registros de Mantenimiento
  let mantenimientoQuery = supabase
    .from('mantenimiento')
    .select(`
      id,
      date,
      vehiculo_id,
      total_value,
      vehiculo:vehiculos (
        driver_id
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (vehiculoId !== 'todos') {
    mantenimientoQuery = mantenimientoQuery.eq('vehiculo_id', vehiculoId);
  }

  const { data: mantenimientos } = await mantenimientoQuery;

  let filteredMantenimientos = mantenimientos || [];
  if (driverId !== 'todos') {
    filteredMantenimientos = filteredMantenimientos.filter(
      (m: any) => m.vehiculo?.driver_id === driverId
    );
  }

  // 4. Consultar Registros de Liquidación
  let liquidacionQuery = supabase
    .from('liquidacion')
    .select('id, payment_date, tercero_id, amount')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate);

  if (driverId !== 'todos') {
    liquidacionQuery = liquidacionQuery.eq('tercero_id', driverId);
  }

  const { data: liquidaciones } = await liquidacionQuery;

  // 5. Agrupar por meses (0 a 11)
  const monthlyIngresos = new Array(12).fill(0);
  const monthlyControl = new Array(12).fill(0);
  const monthlyMantenimiento = new Array(12).fill(0);
  const monthlyLiquidacion = new Array(12).fill(0);

  // Mapa para el desglose de eventos de control
  const eventMap = new Map<string, { name: string; values: number[] }>();

  // Procesar Producción
  (producciones || []).forEach((p: any) => {
    if (p.date) {
      const month = new Date(p.date + 'T00:00:00').getMonth();
      if (month >= 0 && month < 12) {
        const netProd = Number(p.amount || 0) - Number(p.deduction || 0);
        monthlyIngresos[month] += netProd;
      }
    }
  });

  // Procesar Control
  filteredControles.forEach((c: any) => {
    if (c.date) {
      const month = new Date(c.date + 'T00:00:00').getMonth();
      if (month >= 0 && month < 12) {
        const val = Number(c.total_value || 0);
        monthlyControl[month] += val;

        const evId = c.evento_id || 'sin_categoria';
        const evName = c.evento?.name || 'Gastos Generales de Control';

        if (!eventMap.has(evId)) {
          eventMap.set(evId, { name: evName, values: new Array(12).fill(0) });
        }
        eventMap.get(evId)!.values[month] += val;
      }
    }
  });

  // Procesar Mantenimiento
  filteredMantenimientos.forEach((m: any) => {
    if (m.date) {
      const month = new Date(m.date + 'T00:00:00').getMonth();
      if (month >= 0 && month < 12) {
        monthlyMantenimiento[month] += Number(m.total_value || 0);
      }
    }
  });

  // Procesar Liquidación
  (liquidaciones || []).forEach((l: any) => {
    if (l.payment_date) {
      const month = new Date(l.payment_date + 'T00:00:00').getMonth();
      if (month >= 0 && month < 12) {
        monthlyLiquidacion[month] += Number(l.amount || 0);
      }
    }
  });

  // Construir registros mensuales y totales
  let totalIngresos = 0;
  let totalControl = 0;
  let totalMantenimiento = 0;
  let totalLiquidacion = 0;

  const monthlyData: MonthlyFinancialRecord[] = [];

  for (let i = 0; i < 12; i++) {
    const ing = monthlyIngresos[i];
    const ctrl = monthlyControl[i];
    const mant = monthlyMantenimiento[i];
    const liq = monthlyLiquidacion[i];

    const totGastos = ctrl + mant + liq;
    const neto = ing - totGastos;
    const rent = ing > 0 ? (neto / ing) * 100 : null;

    monthlyData.push({
      monthIndex: i,
      monthName: MONTH_NAMES[i],
      ingresos: ing,
      control: ctrl,
      mantenimiento: mant,
      liquidacion: liq,
      totalGastos: totGastos,
      neto: neto,
      rentabilidad: rent,
    });

    totalIngresos += ing;
    totalControl += ctrl;
    totalMantenimiento += mant;
    totalLiquidacion += liq;
  }

  const totalGastos = totalControl + totalMantenimiento + totalLiquidacion;
  const totalNeto = totalIngresos - totalGastos;
  const rentabilidadTotal = totalIngresos > 0 ? (totalNeto / totalIngresos) * 100 : null;

  // Construir desgloses de eventos
  const eventBreakdown: EventControlBreakdown[] = [];
  eventMap.forEach((entry, key) => {
    const sumVal = entry.values.reduce((acc, curr) => acc + curr, 0);
    eventBreakdown.push({
      eventoId: key,
      eventoName: entry.name,
      monthlyValues: entry.values,
      total: sumVal,
    });
  });

  return {
    year,
    selectedVehiculoId: vehiculoId,
    selectedDriverId: driverId,
    selectedEventoId: eventoId,
    totalIngresos,
    totalControl,
    totalMantenimiento,
    totalLiquidacion,
    totalGastos,
    totalNeto,
    rentabilidadTotal,
    monthlyData,
    eventBreakdown,
    totalMantenimientosCount: filteredMantenimientos.length,
    totalProduccionesCount: (producciones || []).length,
  };
}
