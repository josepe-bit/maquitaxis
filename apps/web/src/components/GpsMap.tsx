import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { ActiveVehicleTracking } from '../services/trackingService';

interface GpsMapProps {
  vehicles: ActiveVehicleTracking[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehiculoId: string) => void;
  defaultCenter?: [number, number];
  defaultZoom?: number;
}

// Santa Marta, Colombia coordenadas por defecto si no hay vehículos
const DEFAULT_CENTER: [number, number] = [11.2408, -74.1990];
const DEFAULT_ZOOM = 13;

function getStatusColor(status: string): string {
  switch (status) {
    case 'disponible':
      return '#10b981'; // verde
    case 'en_servicio':
      return '#f59e0b'; // naranja/amarillo
    case 'fuera_de_servicio':
      return '#64748b'; // gris
    case 'sin_conexion':
    default:
      return '#ef4444'; // rojo
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'disponible':
      return 'Disponible';
    case 'en_servicio':
      return 'En Servicio';
    case 'fuera_de_servicio':
      return 'Fuera de Servicio';
    case 'sin_conexion':
    default:
      return 'Sin Conexión';
  }
}

export const GpsMap: React.FC<GpsMapProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // 1. Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // 2. Actualizar marcadores cuando cambia la lista de vehículos
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMarkers = markersRef.current;
    const currentVehicleIds = new Set<string>();

    vehicles.forEach((vehicle) => {
      if (vehicle.lastKnownLat == null || vehicle.lastKnownLng == null) return;

      currentVehicleIds.add(vehicle.vehiculoId);

      const latLng: [number, number] = [vehicle.lastKnownLat, vehicle.lastKnownLng];
      const color = getStatusColor(vehicle.status);
      const isSelected = vehicle.vehiculoId === selectedVehicleId;

      // Icono personalizado con HTML/SVG
      const customIcon = L.divIcon({
        className: 'custom-gps-marker',
        html: `
          <div style="
            position: relative;
            background-color: #1e293b;
            border: 2px solid ${isSelected ? '#38bdf8' : color};
            border-radius: 20px;
            padding: 4px 8px;
            color: #f8fafc;
            font-weight: 700;
            font-size: 11px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
            transform: translate(-50%, -100%);
            cursor: pointer;
            scale: ${isSelected ? '1.15' : '1'};
            transition: all 0.2s ease;
          ">
            <span style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: ${color};
              display: inline-block;
            "></span>
            <span>🚕 ${vehicle.plate}</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 30],
      });

      // Contenido del Popup
      const popupContent = `
        <div style="font-family: inherit; padding: 4px;">
          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
            🚕 Taxi ${vehicle.plate}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 2px;">
            <strong>Conductor:</strong> ${vehicle.driverName || 'Sin asignar'}
          </div>
          ${vehicle.driverPhone ? `<div style="font-size: 12px; color: #475569; margin-bottom: 2px;"><strong>Teléfono:</strong> ${vehicle.driverPhone}</div>` : ''}
          <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
            <strong>Estado:</strong> <span style="color: ${color}; font-weight: 700;">${getStatusLabel(vehicle.status)}</span>
          </div>
          ${vehicle.lastLocationAt ? `<div style="font-size: 10px; color: #94a3b8;">Última pos: ${new Date(vehicle.lastLocationAt).toLocaleTimeString()}</div>` : ''}
        </div>
      `;

      let marker = currentMarkers.get(vehicle.vehiculoId);

      if (marker) {
        // Actualizar posición e icono del marcador existente
        marker.setLatLng(latLng);
        marker.setIcon(customIcon);
        marker.getPopup()?.setContent(popupContent);
      } else {
        // Crear nuevo marcador
        marker = L.marker(latLng, { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent);
        marker.on('click', () => {
          onSelectVehicle(vehicle.vehiculoId);
        });
        currentMarkers.set(vehicle.vehiculoId, marker);
      }
    });

    // Eliminar marcadores de vehículos que ya no estén en la lista
    currentMarkers.forEach((marker, id) => {
      if (!currentVehicleIds.has(id)) {
        map.removeLayer(marker);
        currentMarkers.delete(id);
      }
    });
  }, [vehicles, selectedVehicleId, onSelectVehicle]);

  // 3. Centrar mapa en vehículo seleccionado
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedVehicleId) return;

    const selectedVehicle = vehicles.find((v) => v.vehiculoId === selectedVehicleId);
    if (
      selectedVehicle &&
      selectedVehicle.lastKnownLat != null &&
      selectedVehicle.lastKnownLng != null
    ) {
      map.flyTo([selectedVehicle.lastKnownLat, selectedVehicle.lastKnownLng], 16, {
        duration: 1.2,
      });

      const marker = markersRef.current.get(selectedVehicleId);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedVehicleId, vehicles]);

  // 4. Auto-ajustar vista a todos los vehículos con coordenadas si no hay uno seleccionado
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || selectedVehicleId || vehicles.length === 0) return;

    const points: [number, number][] = vehicles
      .filter((v) => v.lastKnownLat != null && v.lastKnownLng != null)
      .map((v) => [v.lastKnownLat!, v.lastKnownLng!]);

    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [vehicles.length === 0]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} className="leaflet-container" />
    </div>
  );
};

export default GpsMap;
