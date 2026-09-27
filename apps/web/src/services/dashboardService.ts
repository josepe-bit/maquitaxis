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
 * Normaliza valores de filtro ('todos', 'all', '', '0', null, undefined) a un booleano indicando si representa "Todos".
 */
export function isAllFilter(val: string | null | undefined): boolean {
  if (!val) return true;
  const normalized = val.trim().toLowerCase();
  return normalized === 'todos' || normalized === 'all' || normalized === '' || normalized === '0';
}

/**
 * Carga las opciones de filtros disponibles desde los datos reales de Supabase.
 */
export async function getDashboardFilterOptions(servicioId?: string | null): Promise<DashboardFilterOptions> {
  // 1. Cargar Vehículos
  let vehiculosQuery = supabase
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

  if (servicioId) {
    vehiculosQuery = vehiculosQuery.eq('servicio_id', servicioId);
  }

  const { data: vehiculosData, error: vehiculosError } = await vehiculosQuery;
  if (vehiculosError) throw vehiculosError;

  const vehiculos = (vehiculosData || []).map((v: any) => ({
    id: v.id,
    plate: v.plate,
    model: v.model || undefined,
    driverId: v.driver_id || undefined,
    driverName: v.driver?.name || undefined,
  }));

  // 2. Cargar Conductores (is_driver = true)
  const companyDriverIds = (vehiculosData || [])
    .map((v: any) => v.driver_id)
    .filter((id: string | null) => Boolean(id));

  let conductoresQuery = supabase
    .from('terceros')
    .select('id, name, doc_number')
    .eq('is_driver', true)
    .order('name', { ascending: true });

  if (servicioId) {
    if (companyDriverIds.length > 0) {
      conductoresQuery = conductoresQuery.in('id', companyDriverIds);
    } else {
      conductoresQuery = conductoresQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
    }
  }

  const { data: conductoresData, error: conductoresError } = await conductoresQuery;
  if (conductoresError) throw conductoresError;

  const conductores = (conductoresData || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    docNumber: c.doc_number || undefined,
  }));

  // 3. Cargar Catálogo de Eventos
  const { data: eventosData, error: eventosError } = await supabase
    .from('eventos')
    .select('id, name')
    .order('name', { ascending: true });
  if (eventosError) throw eventosError;

  const eventos = (eventosData || []).map((e: any) => ({
    id: e.id,
    name: e.name,
  }));

  // 4. Años disponibles (por defecto año actual y dos anteriores)
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
  eventoId: string = 'todos',
  servicioId?: string | null
): Promise<DashboardFinancialSummary> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const hasVehiculoFilter = !isAllFilter(vehiculoId);
  const hasDriverFilter = !isAllFilter(driverId);
  const hasEventoFilter = !isAllFilter(eventoId);

  // Cargar IDs de vehículos y conductores de la empresa si es Nivel 2
  let companyVehicleIds: string[] | null = null;
  let companyDriverIds: string[] | null = null;

  if (servicioId) {
    const { data: companyVehicles, error: companyVehiclesError } = await supabase
      .from('vehiculos')
      .select('id, driver_id')
      .eq('servicio_id', servicioId);

    if (companyVehiclesError) throw companyVehiclesError;

    companyVehicleIds = (companyVehicles || []).map((v: any) => v.id);
    companyDriverIds = (companyVehicles || [])
      .map((v: any) => v.driver_id)
      .filter((id: string | null) => Boolean(id));
  }

  // 1. Consultar Registros de Producción (Ingresos)
  // Relaciones válidas:
  // - Fecha: produccion.date (Directo)
  // - Vehículo: produccion.vehiculo_id (Directo)
  // - Conductor: produccion.driver_id (Directo, conductor que ejecutó el turno)
  // - Evento: N/A (Producción no se asocia a eventos de control)
  let produccionQuery = supabase
    .from('produccion')
    .select('id, vehiculo_id, driver_id, date, amount, deduction, status')
    .gte('date', startDate)
    .lte('date', endDate);

  if (hasVehiculoFilter) {
    if (servicioId && companyVehicleIds && !companyVehicleIds.includes(vehiculoId)) {
      produccionQuery = produccionQuery.in('vehiculo_id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      produccionQuery = produccionQuery.eq('vehiculo_id', vehiculoId);
    }
  } else if (servicioId && companyVehicleIds) {
    if (companyVehicleIds.length > 0) {
      produccionQuery = produccionQuery.in('vehiculo_id', companyVehicleIds);
    } else {
      produccionQuery = produccionQuery.in('vehiculo_id', ['00000000-0000-0000-0000-000000000000']);
    }
  }

  if (hasDriverFilter) {
    if (servicioId && companyDriverIds && !companyDriverIds.includes(driverId)) {
      produccionQuery = produccionQuery.in('driver_id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      produccionQuery = produccionQuery.eq('driver_id', driverId);
    }
  }

  const { data: producciones, error: produccionError } = await produccionQuery;
  if (produccionError) throw produccionError;

  // 2. Consultar Registros de Control (Gastos Control/Eventos)
  // Relaciones válidas:
  // - Fecha: control.date (Directo)
  // - Vehículo: control.vehiculo_id (Directo)
  // - Evento: control.evento_id (Directo)
  // - Conductor: N/A (Los gastos de control pertenecen al vehículo/evento, sin relación histórica directa con conductor)
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
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (hasVehiculoFilter) {
    if (servicioId && companyVehicleIds && !companyVehicleIds.includes(vehiculoId)) {
      controlQuery = controlQuery.in('vehiculo_id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      controlQuery = controlQuery.eq('vehiculo_id', vehiculoId);
    }
  } else if (servicioId && companyVehicleIds) {
    if (companyVehicleIds.length > 0) {
      controlQuery = controlQuery.in('vehiculo_id', companyVehicleIds);
    } else {
      controlQuery = controlQuery.in('vehiculo_id', ['00000000-0000-0000-0000-000000000000']);
    }
  }

  if (hasEventoFilter) {
    controlQuery = controlQuery.eq('evento_id', eventoId);
  }

  const { data: controles, error: controlError } = await controlQuery;
  if (controlError) throw controlError;

  // 3. Consultar Registros de Mantenimiento
  // Relaciones válidas:
  // - Fecha: mantenimiento.date (Directo)
  // - Vehículo: mantenimiento.vehiculo_id (Directo)
  // - Conductor: N/A (Mantenimiento es de taller/proveedor, sin conductor asociado)
  // - Evento: N/A (Mantenimiento no clasifica por catálogo de eventos de control)
  let mantenimientoQuery = supabase
    .from('mantenimiento')
    .select(`
      id,
      date,
      vehiculo_id,
      total_value
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  if (hasVehiculoFilter) {
    if (servicioId && companyVehicleIds && !companyVehicleIds.includes(vehiculoId)) {
      mantenimientoQuery = mantenimientoQuery.in('vehiculo_id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      mantenimientoQuery = mantenimientoQuery.eq('vehiculo_id', vehiculoId);
    }
  } else if (servicioId && companyVehicleIds) {
    if (companyVehicleIds.length > 0) {
      mantenimientoQuery = mantenimientoQuery.in('vehiculo_id', companyVehicleIds);
    } else {
      mantenimientoQuery = mantenimientoQuery.in('vehiculo_id', ['00000000-0000-0000-0000-000000000000']);
    }
  }

  const { data: mantenimientos, error: mantenimientoError } = await mantenimientoQuery;
  if (mantenimientoError) throw mantenimientoError;

  // 4. Consultar Registros de Liquidación
  // Relaciones válidas:
  // - Fecha: liquidacion.payment_date (Directo)
  // - Conductor: liquidacion.tercero_id (Directo, a quién se liquida)
  // - Vehículo: N/A (La tabla liquidacion no posee vehiculo_id)
  // - Evento: N/A (Liquidación no tiene relación con eventos)
  let liquidacionQuery = supabase
    .from('liquidacion')
    .select('id, payment_date, tercero_id, amount')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate);

  if (hasDriverFilter) {
    if (servicioId && companyDriverIds && !companyDriverIds.includes(driverId)) {
      liquidacionQuery = liquidacionQuery.in('tercero_id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      liquidacionQuery = liquidacionQuery.eq('tercero_id', driverId);
    }
  } else if (servicioId && companyDriverIds) {
    if (companyDriverIds.length > 0) {
      liquidacionQuery = liquidacionQuery.in('tercero_id', companyDriverIds);
    } else {
      liquidacionQuery = liquidacionQuery.in('tercero_id', ['00000000-0000-0000-0000-000000000000']);
    }
  }

  const { data: liquidaciones, error: liquidacionError } = await liquidacionQuery;
  if (liquidacionError) throw liquidacionError;

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
  (controles || []).forEach((c: any) => {
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
  (mantenimientos || []).forEach((m: any) => {
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
    totalMantenimientosCount: (mantenimientos || []).length,
    totalProduccionesCount: (producciones || []).length,
  };
}
