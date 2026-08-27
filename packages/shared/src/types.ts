/**
 * Roles de nivel de servicio en la plataforma
 * Nivel 1: Superadministrador de la app
 * Nivel 2: Cliente / Empresa dueña del servicio
 * Nivel 3: Conductor
 * Nivel 4: Reservado / Libre
 */
export type ServiceLevel = 1 | 2 | 3 | 4;

/**
 * Estados del servicio de suscripción de la app
 */
export type ServiceStatus = 'activo' | 'inactivo';

/**
 * Estados operacionales del vehículo / taxi
 */
export type TaxiStatus = 'disponible' | 'en_servicio' | 'fuera_de_servicio' | 'sin_conexion';

/**
 * Estados de la producción diaria
 */
export type ProductionStatus = 'trabajo' | 'pico_y_placa' | 'taller' | 'descanso';

/**
 * Estados de una carrera / viaje de taxi
 */
export type CarreraStatus = 'pendiente' | 'asignado' | 'aceptado' | 'en_curso' | 'completado' | 'cancelado';

/**
 * Entidad Terceros (Personas, Empresas, Conductores, Proveedores, Propietarios)
 */
export interface Tercero {
  id: string;
  userId?: string; // Vínculo con auth.users en Supabase
  docType: string; // CC, NIT, CE, Passport
  docNumber: string; // Número de documento (obligatorio para autenticación)
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  nequiNumber?: string;
  whatsappNumber?: string;
  birthDate?: string;
  driverLicenseNumber?: string;
  driverLicenseExpiration?: string;
  // Roles múltiples por tercero
  isOwner: boolean; // Propietario de taxi
  isServiceClient: boolean; // Empresa/Servicio contratante de la app
  isDriver: boolean; // Conductor
  isSupplier: boolean; // Proveedor de repuestos/mantenimiento
  createdAt: string;
  updatedAt: string;
}

/**
 * Entidad Servicio (Empresa / Cliente al que se le presta la app)
 */
export interface ServicioApp {
  id: string;
  name: string;
  terceroId: string;
  status: ServiceStatus;
  startDate: string;
  endDate?: string;
  level: ServiceLevel;
  createdAt: string;
  updatedAt: string;
  tercero?: Tercero;
}

/**
 * Catálogo de Marcas de vehículos
 */
export interface Marca {
  id: string;
  name: string;
  country?: string;
  createdAt?: string;
}

export interface MarcaWithStats extends Marca {
  vehiculosCount: number;
}

export interface CreateMarcaInput {
  name: string;
  country?: string;
}

export interface UpdateMarcaInput {
  name: string;
  country?: string;
}

/**
 * Entidad Vehículo / Taxi
 */
export interface Vehiculo {
  id: string;
  plate: string; // Placa (ej: SMR842)
  ownerId: string; // Tercero Propietario
  servicioId: string; // Servicio/Empresa contratante de la app
  model: string;
  displacement?: string; // Cilindraje
  fuelType?: string; // Gasolina, Gas, Diesel, Eléctrico
  passengerCapacity?: number;
  serialNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  color?: string;
  affiliatedCompanyId?: string; // Empresa de transporte (ej: Super Taxis)
  driverId?: string; // Tercero Conductor asignado
  marcaId?: string; // FK Catálogo Marcas
  operationCardNumber?: string;
  operationCardExpedition?: string;
  operationCardValidityStart?: string;
  operationCardValidityEnd?: string;
  dailyFee: number; // Valor de la cuota diaria entregada al propietario
  startShiftTime?: string; // Hora inicio de jornada (ej: "05:00")
  endShiftTime?: string; // Hora entrega del vehículo (ej: "19:00")
  savingsAmount?: number; // Ahorro diario sugerido
  status: TaxiStatus;
  lastKnownLat?: number;
  lastKnownLng?: number;
  lastLocationAt?: string;
  createdAt: string;
  updatedAt: string;
  marca?: Marca;
  owner?: Tercero;
  driver?: Tercero;
  servicio?: ServicioApp;
}

/**
 * Entidad Carrera / Viaje de Taxi
 */
export interface Carrera {
  id: string;
  clientName: string;
  clientPhone: string;
  originAddress: string;
  destinationAddress: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  notes?: string;
  status: CarreraStatus;
  cancelReason?: string;
  vehiculoId?: string;
  driverTerceroId?: string;
  assignedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  trackingSessionId?: string;
  createdAt: string;
  updatedAt: string;
  vehiculo?: Vehiculo;
  driver?: Tercero;
}

/**
 * Catálogo Tarjeta Operación (Requisitos de documentos)
 */
export interface TarjetaOperaRequirement {
  id: string;
  documentCount: number;
  description: string;
}

export type EventoAppliesBy = 'kilometros' | 'meses' | 'kilometros_y_meses' | 'ninguno';

/**
 * Catálogo de Eventos (Mantenimiento preventivo por kilometraje y/o tiempo en meses)
 */
export interface EventoCatalogo {
  id: string;
  name: string; // Ej: Cambio de aceite, Tecnomecánica, SOAT, Cambio de correa
  kmsInterval?: number; // Frecuencia en Kilómetros
  monthsInterval?: number; // Periodicidad en Meses
  appliesBy: EventoAppliesBy; // Criterio de aplicación: 'kilometros' | 'meses' | 'kilometros_y_meses' | 'ninguno'
  estimatedValue?: number;
  createdAt?: string;
}

export interface EventoWithStats extends EventoCatalogo {
  controlsCount: number;
}

export interface CreateEventoInput {
  name: string;
  kmsInterval?: number;
  monthsInterval?: number;
  appliesBy?: EventoAppliesBy;
  estimatedValue?: number;
}

export interface UpdateEventoInput {
  name: string;
  kmsInterval?: number;
  monthsInterval?: number;
  appliesBy?: EventoAppliesBy;
  estimatedValue?: number;
}


/**
 * Registro de Producción Diaria del Vehículo
 */
export interface ProduccionDiaria {
  id: string;
  vehiculoId: string;
  date: string; // Fecha de la producción
  amount: number; // Cuota del día (traída de vehículos)
  deduction: number; // Deducciones por gastos en el día
  status: ProductionStatus;
  mileage: number; // Kilometraje final de la jornada
  savingsAmount: number; // Valor del ahorro entregado
  createdAt: string;
  updatedAt: string;
  vehiculo?: Vehiculo;
}

/**
 * Registro de Control (Ejecución de eventos de mantenimiento preventivo)
 */
export interface ControlEvento {
  id: string;
  date: string;
  eventoId: string;
  vehiculoId: string;
  unitValue: number;
  quantity: number;
  totalValue: number; // unitValue * quantity
  currentMileage: number;
  nextChangeMileage?: number; // currentMileage + kmsInterval
  nextChangeDate?: string; // date + monthsInterval
  createdAt: string;
  evento?: EventoCatalogo;
  vehiculo?: Vehiculo;
}

export interface CreateControlInput {
  date: string;
  eventoId: string;
  vehiculoId: string;
  unitValue: number;
  quantity: number;
  totalValue: number;
  currentMileage: number;
  nextChangeMileage?: number;
  nextChangeDate?: string;
}

export interface UpdateControlInput extends Partial<CreateControlInput> {}


/**
 * Mantenimiento General de Taller
 */
export interface MantenimientoTaller {
  id: string;
  date: string;
  vehiculoId: string;
  supplierId: string; // Tercero Proveedor
  detail: string;
  totalValue: number;
  currentMileage: number;
  createdAt: string;
  supplier?: Tercero;
  vehiculo?: Vehiculo;
}

export interface CreateMantenimientoInput {
  date: string;
  vehiculoId: string;
  supplierId: string;
  detail: string;
  totalValue: number;
  currentMileage: number;
}

export interface UpdateMantenimientoInput extends Partial<CreateMantenimientoInput> {}


/**
 * Catálogo Meses
 */
export interface Mes {
  id: number; // 1 a 12
  name: string;
  totalDays: number;
}

/**
 * Pago Seguridad Social del Conductor
 */
export interface SeguridadSocial {
  id: string;
  terceroId: string; // Conductor
  date: string;
  eventoId?: string;
  monthValue: number;
  daysPaid: number;
  paymentAmount: number; // (monthValue / 30) * daysPaid
  mesId: number;
  createdAt: string;
  tercero?: Tercero;
  mes?: Mes;
  evento?: EventoCatalogo;
}

export interface CreateSeguridadSocialInput {
  terceroId: string;
  date: string;
  eventoId?: string;
  monthValue: number;
  daysPaid: number;
  paymentAmount: number;
  mesId: number;
}

export interface UpdateSeguridadSocialInput extends Partial<CreateSeguridadSocialInput> {}


/**
 * Liquidación de Conductor
 */
export interface LiquidacionConductor {
  id: string;
  terceroId: string; // Conductor
  paymentDate: string;
  fromDate: string;
  toDate: string;
  detail: string;
  amount: number; // Valor pagado por concepto de liquidación
  createdAt: string;
  tercero?: Tercero;
}

export interface CreateLiquidacionInput {
  terceroId: string;
  paymentDate: string;
  fromDate: string;
  toDate: string;
  detail: string;
  amount: number;
}

export interface UpdateLiquidacionInput extends Partial<CreateLiquidacionInput> {}


/**
 * Sesión de Seguimiento GPS
 */
export interface TrackingSession {
  id: string;
  vehiculoId: string;
  driverTerceroId: string;
  startedAt: string;
  endedAt?: string;
  status: 'active' | 'completed' | 'cancelled';
  totalDistanceMeters?: number;
  totalPositionsCount?: number;
}

/**
 * Lectura GPS individual
 */
export interface GPSPosition {
  id?: string;
  sessionId: string;
  vehiculoId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
  isSynced?: boolean;
}

/**
 * Filtro de Configuración GPS Móvil
 */
export interface GPSConfig {
  minDistanceMeters: number;
  maxIntervalSeconds: number;
  minAccuracyMeters: number;
}
