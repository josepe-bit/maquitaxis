import { supabase } from './supabase';
import { Vehiculo, Tercero, ProduccionDiaria, GPSPosition, Marca, ServicioApp, TaxiStatus } from '@maquitaxis/shared';

export interface CreateVehiculoInput {
  plate: string;
  ownerId: string;
  servicioId: string;
  model: string;
  driverId?: string;
  dailyFee: number;
  savingsAmount?: number;
  fuelType?: string;
}

export interface CreateVehiculoFullInput {
  plate: string;
  ownerId: string;
  servicioId: string;
  model: string;
  displacement?: string;
  fuelType?: string;
  passengerCapacity?: number;
  serialNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  color?: string;
  affiliatedCompanyId?: string;
  driverId?: string;
  marcaId?: string;
  operationCardNumber?: string;
  operationCardExpedition?: string;
  operationCardValidityStart?: string;
  operationCardValidityEnd?: string;
  dailyFee: number;
  startShiftTime?: string;
  endShiftTime?: string;
  savingsAmount?: number;
  status?: TaxiStatus;
}

export interface UpdateVehiculoFullInput extends Partial<CreateVehiculoFullInput> {}

export interface CreateTerceroInput {
  docType: string;
  docNumber: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  nequiNumber?: string;
  whatsappNumber?: string;
  birthDate?: string;
  isOwner: boolean;
  isServiceClient: boolean;
  isDriver: boolean;
  isSupplier: boolean;
  driverLicenseNumber?: string;
  driverLicenseExpiration?: string;
}

export interface UpdateTerceroInput extends Partial<CreateTerceroInput> {}

export interface TerceroRelations {
  ownedVehicles: Vehiculo[];
  assignedVehicles: Vehiculo[];
  mantenimientosCount: number;
  serviciosCount: number;
  sSocialCount: number;
  liquidacionCount: number;
  trackingSessionsCount: number;
  carrerasCount: number;
}

export interface VehiculoRelationsCount {
  produccionesCount: number;
  controlCount: number;
  mantenimientosCount: number;
  trackingSessionsCount: number;
  gpsPositionsCount: number;
  carrerasCount: number;
}

interface RawTerceroRow {
  id: string;
  user_id?: string;
  doc_type: string;
  doc_number: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  nequi_number?: string;
  whatsapp_number?: string;
  birth_date?: string;
  driver_license_number?: string;
  driver_license_expiration?: string;
  is_owner: boolean;
  is_service_client: boolean;
  is_driver: boolean;
  is_supplier: boolean;
  created_at: string;
  updated_at: string;
}

interface RawVehiculoRow {
  id: string;
  plate: string;
  owner_id: string;
  servicio_id: string;
  model: string;
  displacement?: string;
  fuel_type?: string;
  passenger_capacity?: number;
  serial_number?: string;
  chassis_number?: string;
  engine_number?: string;
  color?: string;
  affiliated_company_id?: string;
  driver_id?: string;
  marca_id?: string;
  operation_card_number?: string;
  operation_card_expedition?: string;
  operation_card_validity_start?: string;
  operation_card_validity_end?: string;
  daily_fee: number | string;
  start_shift_time?: string;
  end_shift_time?: string;
  savings_amount: number | string;
  status: any;
  last_known_lat?: number;
  last_known_lng?: number;
  last_location_at?: string;
  created_at: string;
  updated_at: string;
  driver?: RawTerceroRow;
  owner?: RawTerceroRow;
  affiliated_company?: RawTerceroRow;
  marca?: any;
  servicio?: any;
}

interface RawProduccionRow {
  id: string;
  vehiculo_id: string;
  date: string;
  amount: number | string;
  deduction: number | string;
  status: any;
  mileage?: number | string;
  savings_amount?: number | string;
  created_at: string;
  updated_at: string;
  vehiculo?: RawVehiculoRow;
}

interface RawGpsPositionRow {
  id: number | string;
  session_id: string;
  vehiculo_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  recorded_at: string;
}

export const adminService = {
  mapRowToTercero(t: RawTerceroRow): Tercero {
    return {
      id: t.id,
      userId: t.user_id,
      docType: t.doc_type,
      docNumber: t.doc_number,
      name: t.name,
      phone: t.phone,
      address: t.address,
      email: t.email,
      nequiNumber: t.nequi_number,
      whatsappNumber: t.whatsapp_number,
      birthDate: t.birth_date,
      driverLicenseNumber: t.driver_license_number,
      driverLicenseExpiration: t.driver_license_expiration,
      isOwner: t.is_owner,
      isServiceClient: t.is_service_client,
      isDriver: t.is_driver,
      isSupplier: t.is_supplier,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  },

  mapRowToVehiculo(v: RawVehiculoRow): Vehiculo {
    return {
      id: v.id,
      plate: v.plate,
      ownerId: v.owner_id,
      servicioId: v.servicio_id,
      model: v.model,
      displacement: v.displacement,
      fuelType: v.fuel_type,
      passengerCapacity: v.passenger_capacity,
      serialNumber: v.serial_number,
      chassisNumber: v.chassis_number,
      engineNumber: v.engine_number,
      color: v.color,
      affiliatedCompanyId: v.affiliated_company_id,
      driverId: v.driver_id,
      marcaId: v.marca_id,
      operationCardNumber: v.operation_card_number,
      operationCardExpedition: v.operation_card_expedition,
      operationCardValidityStart: v.operation_card_validity_start,
      operationCardValidityEnd: v.operation_card_validity_end,
      dailyFee: Number(v.daily_fee || 0),
      startShiftTime: v.start_shift_time,
      endShiftTime: v.end_shift_time,
      savingsAmount: Number(v.savings_amount || 0),
      status: v.status,
      lastKnownLat: v.last_known_lat,
      lastKnownLng: v.last_known_lng,
      lastLocationAt: v.last_location_at,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
      driver: v.driver ? this.mapRowToTercero(v.driver) : undefined,
      owner: v.owner ? this.mapRowToTercero(v.owner) : undefined,
      marca: v.marca ? { id: v.marca.id, name: v.marca.name, country: v.marca.country } : undefined,
      servicio: v.servicio
        ? {
            id: v.servicio.id,
            name: v.servicio.name,
            terceroId: v.servicio.tercero_id,
            status: v.servicio.status,
            startDate: v.servicio.start_date,
            endDate: v.servicio.end_date,
            level: v.servicio.level,
            createdAt: v.servicio.created_at,
            updatedAt: v.servicio.updated_at,
          }
        : undefined,
    };
  },

  /**
   * Cargar catálogo de Marcas
   */
  async fetchMarcas(): Promise<Marca[]> {
    const { data, error } = await supabase.from('marcas').select('*').order('name', { ascending: true });
    if (error || !data) return [];
    return data.map((m: any) => ({ id: m.id, name: m.name, country: m.country }));
  },

  /**
   * Cargar catálogo de Servicios de suscripción de la App
   */
  async fetchServiciosApp(): Promise<ServicioApp[]> {
    const { data, error } = await supabase.from('servicios').select('*').order('name', { ascending: true });
    if (error || !data) return [];
    return data.map((s: any) => ({
      id: s.id,
      name: s.name,
      terceroId: s.tercero_id,
      status: s.status,
      startDate: s.start_date,
      endDate: s.end_date,
      level: s.level,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
  },

  /**
   * Cargar lista de Terceros con búsqueda y filtros opcionales de rol y estado (access_status)
   */
  async fetchTerceros(searchQuery?: string, roleFilter?: string, statusFilter?: string): Promise<Tercero[]> {
    let query = supabase.from('terceros').select('*').order('name', { ascending: true });

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`doc_number.ilike.${q},name.ilike.${q},phone.ilike.${q},email.ilike.${q}`);
    }

    if (roleFilter) {
      if (roleFilter === 'owner') query = query.eq('is_owner', true);
      if (roleFilter === 'driver') query = query.eq('is_driver', true);
      if (roleFilter === 'supplier') query = query.eq('is_supplier', true);
      if (roleFilter === 'client') query = query.eq('is_service_client', true);
    }

    if (statusFilter) {
      query = query.eq('access_status', statusFilter);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as RawTerceroRow[]).map((t) => this.mapRowToTercero(t));
  },

  /**
   * Obtener detalle completo de un tercero por ID
   */
  async getTerceroById(id: string): Promise<Tercero | null> {
    const { data, error } = await supabase.from('terceros').select('*').eq('id', id).single();
    if (error || !data) return null;
    return this.mapRowToTercero(data as RawTerceroRow);
  },

  /**
   * Crear nuevo Tercero en la base de datos
   */
  async createTercero(input: CreateTerceroInput): Promise<Tercero> {
    if (!input.docType || !input.docNumber.trim() || !input.name.trim()) {
      throw new Error('Tipo de documento, número de documento y nombre completo son obligatorios.');
    }

    if (input.isDriver && (!input.driverLicenseNumber || !input.driverLicenseNumber.trim())) {
      throw new Error('La licencia de conducción es obligatoria para registrar un conductor.');
    }

    const { data: existing } = await supabase
      .from('terceros')
      .select('id')
      .eq('doc_number', input.docNumber.trim())
      .maybeSingle();

    if (existing) {
      throw new Error(`Ya existe un tercero registrado con el número de documento ${input.docNumber.trim()}.`);
    }

    const { data, error } = await supabase
      .from('terceros')
      .insert({
        doc_type: input.docType,
        doc_number: input.docNumber.trim(),
        name: input.name.trim(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        email: input.email?.trim() || null,
        nequi_number: input.nequiNumber?.trim() || null,
        whatsapp_number: input.whatsappNumber?.trim() || null,
        birth_date: input.birthDate || null,
        is_owner: !!input.isOwner,
        is_service_client: !!input.isServiceClient,
        is_driver: !!input.isDriver,
        is_supplier: !!input.isSupplier,
        driver_license_number: input.driverLicenseNumber?.trim() || null,
        driver_license_expiration: input.driverLicenseExpiration || null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al crear el tercero.');
    }

    return this.mapRowToTercero(data as RawTerceroRow);
  },

  /**
   * Actualizar un Tercero existente
   */
  async updateTercero(id: string, input: UpdateTerceroInput): Promise<Tercero> {
    if (input.isDriver && (!input.driverLicenseNumber || !input.driverLicenseNumber.trim())) {
      throw new Error('La licencia de conducción es obligatoria si el tercero posee rol de conductor.');
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('terceros')
      .update({
        doc_type: input.docType,
        doc_number: input.docNumber?.trim(),
        name: input.name?.trim(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        email: input.email?.trim() || null,
        nequi_number: input.nequiNumber?.trim() || null,
        whatsapp_number: input.whatsappNumber?.trim() || null,
        birth_date: input.birthDate || null,
        is_owner: input.isOwner,
        is_service_client: input.isServiceClient,
        is_driver: input.isDriver,
        is_supplier: input.isSupplier,
        driver_license_number: input.driverLicenseNumber?.trim() || null,
        driver_license_expiration: input.driverLicenseExpiration || null,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al actualizar la información del tercero.');
    }

    return this.mapRowToTercero(data as RawTerceroRow);
  },

  /**
   * Consultar relaciones históricas de un tercero
   */
  async fetchTerceroRelations(terceroId: string): Promise<TerceroRelations> {
    const [
      { data: owned },
      { data: assigned },
      { count: mantCount },
      { count: servCount },
      { count: ssCount },
      { count: liqCount },
      { count: trackCount },
      { count: carrCount },
    ] = await Promise.all([
      supabase.from('vehiculos').select('*').eq('owner_id', terceroId),
      supabase.from('vehiculos').select('*').eq('driver_id', terceroId),
      supabase.from('mantenimiento').select('id', { count: 'exact', head: true }).eq('supplier_id', terceroId),
      supabase.from('servicios').select('id', { count: 'exact', head: true }).eq('tercero_id', terceroId),
      supabase.from('s_social').select('id', { count: 'exact', head: true }).eq('tercero_id', terceroId),
      supabase.from('liquidacion').select('id', { count: 'exact', head: true }).eq('tercero_id', terceroId),
      supabase.from('tracking_sessions').select('id', { count: 'exact', head: true }).eq('driver_tercero_id', terceroId),
      supabase.from('carreras').select('id', { count: 'exact', head: true }).eq('driver_tercero_id', terceroId),
    ]);

    const ownedVehicles: Vehiculo[] = (owned || []).map((v) => ({
      id: v.id,
      plate: v.plate,
      ownerId: v.owner_id,
      servicioId: v.servicio_id,
      model: v.model,
      dailyFee: Number(v.daily_fee || 0),
      status: v.status,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));

    const assignedVehicles: Vehiculo[] = (assigned || []).map((v) => ({
      id: v.id,
      plate: v.plate,
      ownerId: v.owner_id,
      servicioId: v.servicio_id,
      model: v.model,
      dailyFee: Number(v.daily_fee || 0),
      status: v.status,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));

    return {
      ownedVehicles,
      assignedVehicles,
      mantenimientosCount: mantCount || 0,
      serviciosCount: servCount || 0,
      sSocialCount: ssCount || 0,
      liquidacionCount: liqCount || 0,
      trackingSessionsCount: trackCount || 0,
      carrerasCount: carrCount || 0,
    };
  },

  /**
   * Eliminación segura de un tercero
   */
  async deleteTerceroSafe(terceroId: string): Promise<void> {
    const rels = await this.fetchTerceroRelations(terceroId);
    const totalRels =
      rels.ownedVehicles.length +
      rels.assignedVehicles.length +
      rels.mantenimientosCount +
      rels.serviciosCount +
      rels.sSocialCount +
      rels.liquidacionCount +
      rels.trackingSessionsCount +
      rels.carrerasCount;

    if (totalRels > 0) {
      throw new Error(
        `No se puede eliminar este tercero porque posee registros vinculados (${rels.ownedVehicles.length} vehículos en propiedad, ${rels.assignedVehicles.length} taxis asignados, ${rels.mantenimientosCount} mantenimientos, ${rels.carrerasCount} carreras). Para preservar la integridad histórica, este registro no debe eliminarse.`
      );
    }

    const { error } = await supabase.from('terceros').delete().eq('id', terceroId);
    if (error) {
      throw new Error(error.message || 'No se pudo eliminar el tercero.');
    }
  },

  /**
   * Cargar lista completa de Vehículos / Taxis con filtros opcionales
   */
  async fetchVehiculos(searchQuery?: string, statusFilter?: string): Promise<Vehiculo[]> {
    let query = supabase
      .from('vehiculos')
      .select('*, driver:terceros!vehiculos_driver_id_fkey(*), owner:terceros!vehiculos_owner_id_fkey(*), affiliated_company:terceros!vehiculos_affiliated_company_id_fkey(*), marca:marcas(*), servicio:servicios(*)')
      .order('plate', { ascending: true });

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = `%${searchQuery.trim()}%`;
      query = query.or(`plate.ilike.${q}`);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter as any);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as unknown as RawVehiculoRow[]).map((v) => this.mapRowToVehiculo(v));
  },

  /**
   * Obtener detalle completo de un vehículo por ID
   */
  async getVehiculoById(id: string): Promise<Vehiculo | null> {
    const { data, error } = await supabase
      .from('vehiculos')
      .select('*, driver:terceros!vehiculos_driver_id_fkey(*), owner:terceros!vehiculos_owner_id_fkey(*), affiliated_company:terceros!vehiculos_affiliated_company_id_fkey(*), marca:marcas(*), servicio:servicios(*)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapRowToVehiculo(data as unknown as RawVehiculoRow);
  },

  /**
   * Crear nuevo vehículo / taxi con formulario completo
   */
  async createVehiculo(input: CreateVehiculoInput): Promise<Vehiculo> {
    const fullInput: CreateVehiculoFullInput = {
      plate: input.plate,
      ownerId: input.ownerId,
      servicioId: input.servicioId,
      model: input.model,
      driverId: input.driverId,
      dailyFee: input.dailyFee,
      savingsAmount: input.savingsAmount,
      fuelType: input.fuelType,
    };
    return this.createVehiculoFull(fullInput);
  },

  /**
   * Crear vehículo completo con todas las secciones de formulario
   */
  async createVehiculoFull(input: CreateVehiculoFullInput): Promise<Vehiculo> {
    const cleanPlate = input.plate.trim().toUpperCase();
    if (!cleanPlate) {
      throw new Error('La placa del vehículo es obligatoria.');
    }
    if (!input.ownerId) {
      throw new Error('Debe seleccionar un propietario (tercero con is_owner = true).');
    }
    if (!input.servicioId) {
      throw new Error('Debe seleccionar un servicio de la app.');
    }

    // Comprobar si la placa ya existe
    const { data: existing } = await supabase.from('vehiculos').select('id').eq('plate', cleanPlate).maybeSingle();
    if (existing) {
      throw new Error(`Ya existe un vehículo registrado con la placa ${cleanPlate}.`);
    }

    // Validar propietario
    const owner = await this.getTerceroById(input.ownerId);
    if (!owner || !owner.isOwner) {
      throw new Error('El tercero seleccionado como propietario debe tener activado el rol de Propietario (is_owner).');
    }

    // Validar conductor si se especificó
    if (input.driverId) {
      const driver = await this.getTerceroById(input.driverId);
      if (!driver || !driver.isDriver) {
        throw new Error('El tercero seleccionado como conductor debe tener activado el rol de Conductor (is_driver).');
      }
    }

    // Validar fechas de tarjeta de operación
    if (input.operationCardValidityStart && input.operationCardValidityEnd) {
      if (new Date(input.operationCardValidityEnd) < new Date(input.operationCardValidityStart)) {
        throw new Error('La fecha de fin de vigencia de la tarjeta de operación no puede ser anterior a la fecha de inicio.');
      }
    }

    const { data, error } = await supabase
      .from('vehiculos')
      .insert({
        plate: cleanPlate,
        owner_id: input.ownerId,
        servicio_id: input.servicioId,
        model: input.model.trim() || '2023',
        displacement: input.displacement?.trim() || null,
        fuel_type: input.fuelType?.trim() || 'Gasolina/Gas',
        passenger_capacity: input.passengerCapacity || 4,
        serial_number: input.serialNumber?.trim() || null,
        chassis_number: input.chassisNumber?.trim() || null,
        engine_number: input.engineNumber?.trim() || null,
        color: input.color?.trim() || null,
        affiliated_company_id: input.affiliatedCompanyId || null,
        driver_id: input.driverId || null,
        marca_id: input.marcaId || null,
        operation_card_number: input.operationCardNumber?.trim() || null,
        operation_card_expedition: input.operationCardExpedition || null,
        operation_card_validity_start: input.operationCardValidityStart || null,
        operation_card_validity_end: input.operationCardValidityEnd || null,
        daily_fee: input.dailyFee >= 0 ? input.dailyFee : 0,
        start_shift_time: input.startShiftTime || null,
        end_shift_time: input.endShiftTime || null,
        savings_amount: input.savingsAmount && input.savingsAmount >= 0 ? input.savingsAmount : 0,
        status: input.status || 'disponible',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al registrar el vehículo.');
    }

    return this.mapRowToVehiculo(data as RawVehiculoRow);
  },

  /**
   * Actualizar vehículo existente (protegiendo los campos GPS)
   */
  async updateVehiculoFull(id: string, input: UpdateVehiculoFullInput): Promise<Vehiculo> {
    if (input.driverId) {
      const driver = await this.getTerceroById(input.driverId);
      if (!driver || !driver.isDriver) {
        throw new Error('El tercero seleccionado como conductor debe tener activado el rol de Conductor (is_driver).');
      }
    }

    if (input.operationCardValidityStart && input.operationCardValidityEnd) {
      if (new Date(input.operationCardValidityEnd) < new Date(input.operationCardValidityStart)) {
        throw new Error('La fecha de fin de vigencia de la tarjeta de operación no puede ser anterior a la fecha de inicio.');
      }
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('vehiculos')
      .update({
        plate: input.plate?.trim().toUpperCase(),
        owner_id: input.ownerId,
        servicio_id: input.servicioId,
        model: input.model?.trim(),
        displacement: input.displacement?.trim() || null,
        fuel_type: input.fuelType?.trim() || null,
        passenger_capacity: input.passengerCapacity,
        serial_number: input.serialNumber?.trim() || null,
        chassis_number: input.chassisNumber?.trim() || null,
        engine_number: input.engineNumber?.trim() || null,
        color: input.color?.trim() || null,
        affiliated_company_id: input.affiliatedCompanyId || null,
        driver_id: input.driverId || null,
        marca_id: input.marcaId || null,
        operation_card_number: input.operationCardNumber?.trim() || null,
        operation_card_expedition: input.operationCardExpedition || null,
        operation_card_validity_start: input.operationCardValidityStart || null,
        operation_card_validity_end: input.operationCardValidityEnd || null,
        daily_fee: input.dailyFee,
        start_shift_time: input.startShiftTime || null,
        end_shift_time: input.endShiftTime || null,
        savings_amount: input.savingsAmount,
        status: input.status,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Error al actualizar la información del vehículo.');
    }

    return this.mapRowToVehiculo(data as RawVehiculoRow);
  },

  /**
   * Consultar relaciones históricas de un vehículo
   */
  async fetchVehiculoRelations(vehiculoId: string): Promise<VehiculoRelationsCount> {
    const [
      { count: prodCount },
      { count: ctrlCount },
      { count: mantCount },
      { count: trackCount },
      { count: gpsCount },
      { count: carrCount },
    ] = await Promise.all([
      supabase.from('produccion').select('id', { count: 'exact', head: true }).eq('vehiculo_id', vehiculoId),
      supabase.from('control').select('id', { count: 'exact', head: true }).eq('vehiculo_id', vehiculoId),
      supabase.from('mantenimiento').select('id', { count: 'exact', head: true }).eq('vehiculo_id', vehiculoId),
      supabase.from('tracking_sessions').select('id', { count: 'exact', head: true }).eq('vehiculo_id', vehiculoId),
      supabase.from('gps_positions').select('id', { count: 'exact', head: true }).eq('vehiculo_id', vehiculoId),
      supabase.from('carreras').select('id', { count: 'exact', head: true }).eq('vehiculo_id', vehiculoId),
    ]);

    return {
      produccionesCount: prodCount || 0,
      controlCount: ctrlCount || 0,
      mantenimientosCount: mantCount || 0,
      trackingSessionsCount: trackCount || 0,
      gpsPositionsCount: gpsCount || 0,
      carrerasCount: carrCount || 0,
    };
  },

  /**
   * Eliminación segura de un vehículo
   */
  async deleteVehiculoSafe(vehiculoId: string): Promise<void> {
    const rels = await this.fetchVehiculoRelations(vehiculoId);
    const totalRels =
      rels.produccionesCount +
      rels.controlCount +
      rels.mantenimientosCount +
      rels.trackingSessionsCount +
      rels.gpsPositionsCount +
      rels.carrerasCount;

    if (totalRels > 0) {
      throw new Error(
        `No se puede eliminar este taxi porque cuenta con registros históricos vinculados (${rels.produccionesCount} producciones, ${rels.mantenimientosCount} mantenimientos, ${rels.carrerasCount} carreras, ${rels.trackingSessionsCount} sesiones GPS). Para preservar la integridad del sistema, este vehículo no debe ser eliminado.`
      );
    }

    const { error } = await supabase.from('vehiculos').delete().eq('id', vehiculoId);
    if (error) {
      throw new Error(error.message || 'No se pudo eliminar el vehículo.');
    }
  },

  /**
   * Cargar registros de Producción Diaria con filtros opcionales
   */
  async fetchProducciones(vehiculoId?: string): Promise<ProduccionDiaria[]> {
    let query = supabase.from('produccion').select('*, vehiculo:vehiculos(*)').order('date', { ascending: false });

    if (vehiculoId) {
      query = query.eq('vehiculo_id', vehiculoId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    const rows = data as RawProduccionRow[];

    return rows.map((p) => ({
      id: p.id,
      vehiculoId: p.vehiculo_id,
      date: p.date,
      amount: Number(p.amount || 0),
      deduction: Number(p.deduction || 0),
      status: p.status,
      mileage: Number(p.mileage || 0),
      savingsAmount: Number(p.savings_amount || 0),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      vehiculo: p.vehiculo ? this.mapRowToVehiculo(p.vehiculo) : undefined,
    }));
  },

  /**
   * Consultar histórico de posiciones GPS para trazado de ruta en mapa
   */
  async fetchGpsHistory(vehiculoId: string, limit: number = 500): Promise<GPSPosition[]> {
    const { data, error } = await supabase
      .from('gps_positions')
      .select('*')
      .eq('vehiculo_id', vehiculoId)
      .order('recorded_at', { ascending: true })
      .limit(limit);

    if (error || !data) return [];

    const rows = data as RawGpsPositionRow[];

    return rows.map((p) => ({
      id: String(p.id),
      sessionId: p.session_id,
      vehiculoId: p.vehiculo_id,
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude,
      speed: p.speed,
      heading: p.heading,
      accuracy: p.accuracy,
      timestamp: p.recorded_at,
    }));
  },
};
