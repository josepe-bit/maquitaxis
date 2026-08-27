import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AuthDriverState, authDriverService } from '../services/auth';
import { useTaxiTracking } from '../hooks/useTaxiTracking';

interface DriverHomeScreenProps {
  authData: AuthDriverState;
  onLogout: () => void;
  onOpenProduccion?: () => void;
  onOpenCarreras?: () => void;
}

export const DriverHomeScreen: React.FC<DriverHomeScreenProps> = ({
  authData,
  onLogout,
  onOpenProduccion,
  onOpenCarreras,
}) => {
  const { tercero, vehiculo } = authData;

  const {
    startTracking,
    stopTracking,
    isTracking,
    currentLocation,
    totalDistanceMeters,
    totalPositionsCount,
    speedKmh,
    accuracyMeters,
    lastUpdateTime,
    filterReason,
    loading,
    error,
  } = useTaxiTracking({ authData });

  const handleStartService = async () => {
    if (!vehiculo) {
      Alert.alert('Sin Vehículo', 'No tienes un taxi o vehículo asignado actualmente.');
      return;
    }
    await startTracking();
  };

  const handleEndService = async () => {
    Alert.alert(
      'Finalizar Servicio',
      `¿Deseas concluir la jornada del taxi ${vehiculo?.plate || ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            await stopTracking();
            Alert.alert('Servicio Finalizado', 'La jornada ha sido concluida correctamente.');
          },
        },
      ]
    );
  };

  const handleChangePasswordPress = () => {
    Alert.prompt(
      'Cambiar Contraseña',
      'Ingresa tu nueva contraseña (mínimo 6 caracteres):',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          onPress: async (newPass?: string) => {
            if (!newPass || newPass.trim().length < 6) {
              Alert.alert('Error', 'La contraseña debe contener al menos 6 caracteres.');
              return;
            }
            try {
              await authDriverService.changePassword(newPass.trim());
              Alert.alert('¡Éxito!', 'Tu contraseña ha sido actualizada correctamente.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo cambiar la contraseña.');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const handleLogoutPress = () => {
    if (isTracking) {
      Alert.alert(
        'Servicio Activo',
        'Debes finalizar el servicio GPS antes de cerrar la sesión.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    authDriverService.logout();
    onLogout();
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>🚕 MaquiTaxis</Text>
          <Text style={styles.brandTag}>Panel del Conductor</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.logoutButton, { backgroundColor: '#d97706' }]} onPress={handleChangePasswordPress}>
            <Text style={styles.logoutText}>🔑 Clave</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Card Info del Conductor y Vehículo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>MI TAXI</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Conductor:</Text>
            <Text style={styles.infoValue}>{tercero.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehículo Asignado:</Text>
            <Text style={[styles.infoValue, styles.highlightPlate]}>
              {vehiculo ? `Taxi ${vehiculo.plate}` : 'Sin asignación'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado Operacional:</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.dot, isTracking ? styles.dotGreen : styles.dotGray]} />
              <Text style={styles.badgeText}>
                {isTracking ? '🟢 EN SERVICIO' : '🟡 DISPONIBLE'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card de Estado del GPS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 ESTADO DE SEGUIMIENTO GPS</Text>

          <View style={styles.gpsStatusRow}>
            <Text style={styles.gpsLabel}>GPS:</Text>
            <Text style={[styles.gpsValue, isTracking ? styles.textGreen : styles.textGray]}>
              {isTracking ? '🟢 ACTIVO' : '⚪ INACTIVO'}
            </Text>
          </View>

          <View style={styles.gpsStatusRow}>
            <Text style={styles.gpsLabel}>Precisión:</Text>
            <Text style={styles.gpsValue}>
              {accuracyMeters !== null ? `${accuracyMeters} metros` : '---'}
            </Text>
          </View>

          <View style={styles.gpsStatusRow}>
            <Text style={styles.gpsLabel}>Velocidad:</Text>
            <Text style={styles.gpsValue}>
              {speedKmh !== null ? `${speedKmh} km/h` : '0 km/h'}
            </Text>
          </View>

          <View style={styles.gpsStatusRow}>
            <Text style={styles.gpsLabel}>Distancia Recorrida:</Text>
            <Text style={styles.distanceValue}>{formatDistance(totalDistanceMeters)}</Text>
          </View>

          <View style={styles.gpsStatusRow}>
            <Text style={styles.gpsLabel}>Posiciones Registradas:</Text>
            <Text style={styles.gpsValue}>{totalPositionsCount} puntos</Text>
          </View>

          <View style={styles.gpsStatusRow}>
            <Text style={styles.gpsLabel}>📡 Última actualización:</Text>
            <Text style={styles.gpsValue}>{lastUpdateTime || 'Sin lecturas'}</Text>
          </View>

          {currentLocation && (
            <View style={styles.gpsStatusRow}>
              <Text style={styles.gpsLabel}>Coordenadas:</Text>
              <Text style={styles.coordsValue}>
                {currentLocation.latitude.toFixed(5)}, {currentLocation.longitude.toFixed(5)}
              </Text>
            </View>
          )}

          <View style={styles.reasonRow}>
            <Text style={styles.reasonText}>Filtro: {filterReason}</Text>
          </View>
        </View>

        {/* Botones de Control de Servicio y Producción */}
        <View style={styles.controlsContainer}>
          {onOpenCarreras && (
            <TouchableOpacity
              style={[styles.produccionButton, { backgroundColor: '#8b5cf6' }]}
              onPress={onOpenCarreras}
              activeOpacity={0.85}
            >
              <Text style={styles.produccionButtonText}>🚖 MIS SERVICIOS / CARRERAS</Text>
            </TouchableOpacity>
          )}

          {onOpenProduccion && (
            <TouchableOpacity
              style={styles.produccionButton}
              onPress={onOpenProduccion}
              activeOpacity={0.85}
            >
              <Text style={styles.produccionButtonText}>💵 REGISTRAR PRODUCCIÓN DIARIA</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#f59e0b" style={{ marginVertical: 20 }} />
          ) : !isTracking ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.buttonStart]}
              onPress={handleStartService}
              activeOpacity={0.85}
            >
              <Text style={styles.actionButtonText}>[ INICIAR SERVICIO ]</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.buttonStop]}
              onPress={handleEndService}
              activeOpacity={0.85}
            >
              <Text style={styles.actionButtonText}>[ FINALIZAR SERVICIO ]</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Filtro Inteligente: Distancia ≥ 15m | Reposo ≤ 30s | Precisión ≤ 30m
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandContainer: {
    flexDirection: 'column',
  },
  brandTitle: {
    color: '#f59e0b',
    fontSize: 20,
    fontWeight: '800',
  },
  brandTag: {
    color: '#94a3b8',
    fontSize: 12,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  logoutText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  infoValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  highlightPlate: {
    color: '#f59e0b',
    fontWeight: '800',
    fontSize: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotGreen: {
    backgroundColor: '#10b981',
  },
  dotGray: {
    backgroundColor: '#94a3b8',
  },
  badgeText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  gpsStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  gpsLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  gpsValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  distanceValue: {
    color: '#f59e0b',
    fontSize: 15,
    fontWeight: '800',
  },
  coordsValue: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  reasonRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 65, 85, 0.5)',
  },
  reasonText: {
    color: '#64748b',
    fontSize: 11,
    fontStyle: 'italic',
  },
  textGreen: {
    color: '#10b981',
  },
  textGray: {
    color: '#64748b',
  },
  controlsContainer: {
    marginTop: 12,
  },
  produccionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  produccionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
  },
  buttonStart: {
    backgroundColor: '#10b981',
  },
  buttonStop: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
});
