import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Vehiculo, TaxiStatus } from '@maquitaxis/shared';

interface TaxiMapProps {
  vehiculos: Vehiculo[];
  selectedVehiculoId?: string;
}

export const TaxiMap: React.FC<TaxiMapProps> = ({ vehiculos, selectedVehiculoId }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Inicializar Mapa Leaflet centrado en Ibagué / Colombia (o primer vehículo)
    const initialLat = vehiculos[0]?.lastKnownLat || 4.4378;
    const initialLng = vehiculos[0]?.lastKnownLng || -75.2006;

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
    });

    // Capa OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | MaquiTaxis Realtime GPS',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Determinar color de badge según estado operacional
  const getStatusColor = (status: TaxiStatus, lastLocationAt?: string): { bg: string; text: string; label: string } => {
    // Si han pasado más de 3 minutos sin actualización GPS, considerar sin_conexion
    if (lastLocationAt) {
      const elapsedMs = Date.now() - new Date(lastLocationAt).getTime();
      if (elapsedMs > 3 * 60 * 1000 && status === 'en_servicio') {
        return { bg: '#64748b', text: '#ffffff', label: 'SIN CONEXIÓN' };
      }
    }

    switch (status) {
      case 'en_servicio':
        return { bg: '#f59e0b', text: '#0f172a', label: 'EN SERVICIO' };
      case 'disponible':
        return { bg: '#10b981', text: '#ffffff', label: 'DISPONIBLE' };
      case 'sin_conexion':
        return { bg: '#64748b', text: '#ffffff', label: 'SIN CONEXIÓN' };
      case 'fuera_de_servicio':
        return { bg: '#ef4444', text: '#ffffff', label: 'FUERA DE SERVICIO' };
      default:
        return { bg: '#64748b', text: '#ffffff', label: String(status || '').toUpperCase() };
    }
  };

  // Actualizar marcadores de taxis dinámicamente en el mapa
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    vehiculos.forEach((vehiculo) => {
      const lat = vehiculo.lastKnownLat || 11.24079;
      const lng = vehiculo.lastKnownLng || -74.19904;
      const statusStyle = getStatusColor(vehiculo.status, vehiculo.lastLocationAt);

      const customIcon = L.divIcon({
        className: 'custom-taxi-marker',
        html: `
          <div style="
            background: ${statusStyle.bg};
            color: ${statusStyle.text};
            font-weight: 800;
            font-size: 11px;
            padding: 4px 8px;
            border-radius: 6px;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span>🚕</span>
            <span>${vehiculo.plate}</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });

      const driverName = vehiculo.driver ? vehiculo.driver.name : 'Conductor no asignado';
      const lastTimeStr = vehiculo.lastLocationAt
        ? new Date(vehiculo.lastLocationAt).toLocaleTimeString()
        : 'Sin lecturas';

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; padding: 6px; color: #0f172a; min-width: 180px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <h4 style="margin: 0; color: #d97706; font-size: 14px; font-weight: 800;">Taxi ${vehiculo.plate}</h4>
            <span style="background: ${statusStyle.bg}; color: ${statusStyle.text}; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
              ${statusStyle.label}
            </span>
          </div>
          <p style="margin: 0 0 3px 0; font-size: 12px;"><strong>Conductor:</strong> ${driverName}</p>
          <p style="margin: 0 0 3px 0; font-size: 12px;"><strong>Modelo:</strong> ${vehiculo.model}</p>
          <p style="margin: 0 0 3px 0; font-size: 11px; color: #38bdf8;"><strong>Coordenadas:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
          <p style="margin: 0; font-size: 11px; color: #64748b;"><strong>Última señal:</strong> ${lastTimeStr}</p>
        </div>
      `;

      if (markersRef.current[vehiculo.id]) {
        // Mover marcador existente con animación de posición
        markersRef.current[vehiculo.id].setLatLng([lat, lng]);
        markersRef.current[vehiculo.id].setIcon(customIcon);
        markersRef.current[vehiculo.id].setPopupContent(popupContent);
      } else {
        // Crear nuevo marcador
        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent);
        markersRef.current[vehiculo.id] = marker;
      }

      // Si está seleccionado, centrar la cámara suavemente en este taxi
      if (selectedVehiculoId === vehiculo.id) {
        map.panTo([lat, lng]);
      }
    });
  }, [vehiculos, selectedVehiculoId]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};
