import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { adminService } from '../services/adminService';
import { Vehiculo, GPSPosition } from '@maquitaxis/shared';
import { Navigation, Play, RefreshCw } from 'lucide-react';

export const HistoryRoutesPage: React.FC = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedVehiculoId, setSelectedVehiculoId] = useState<string>('');
  const [gpsPositions, setGpsPositions] = useState<GPSPosition[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    adminService.fetchVehiculos().then((list) => {
      setVehiculos(list);
      if (list.length > 0) {
        setSelectedVehiculoId(list[0].id);
      }
    });
  }, []);

  // Inicializar Mapa Leaflet para histórico
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [11.24079, -74.19904],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors | MaquiTaxis Histórico GPS',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const loadRouteHistory = async () => {
    if (!selectedVehiculoId) return;
    setLoading(true);
    try {
      const positions = await adminService.fetchGpsHistory(selectedVehiculoId, 300);
      setGpsPositions(positions);

      if (mapRef.current) {
        const map = mapRef.current;

        // Limpiar polilínea anterior
        if (polylineRef.current) {
          polylineRef.current.remove();
          polylineRef.current = null;
        }

        if (positions.length > 0) {
          const latLngs: [number, number][] = positions.map((p) => [p.latitude, p.longitude]);

          // Trazar línea de ruta azul
          const polyline = L.polyline(latLngs, {
            color: '#38bdf8',
            weight: 5,
            opacity: 0.8,
            smoothFactor: 1,
          }).addTo(map);

          polylineRef.current = polyline;

          // Ajustar zoom del mapa a los límites de la ruta trazada
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        }
      }
    } catch {
      // Ignorar error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedVehiculoId) {
      loadRouteHistory();
    }
  }, [selectedVehiculoId]);

  const selectedVehicle = vehiculos.find((v) => v.id === selectedVehiculoId);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar Histórico */}
      <aside style={{ width: '320px', background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
          <Navigation size={22} />
          <span>Histórico GPS</span>
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Selecciona un taxi para trazar la ruta de su última jornada recorrida.
        </p>

        <div>
          <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
            Taxi Monitoreado
          </label>
          <select
            value={selectedVehiculoId}
            onChange={(e) => setSelectedVehiculoId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)' }}
          >
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>
                Taxi {v.plate} ({v.model})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={loadRouteHistory}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'var(--bg-dark)', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
        >
          <RefreshCw size={16} />
          <span>Trazar Ruta Reciente</span>
        </button>

        <div style={{ background: 'var(--bg-dark)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
            Detalles de la Trayectoria
          </h4>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Taxi: <strong>{selectedVehicle?.plate || '---'}</strong>
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Puntos trazados: <strong>{gpsPositions.length} lecturas</strong>
          </p>
        </div>
      </aside>

      {/* Mapa Leaflet */}
      <main style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </main>
    </div>
  );
};
