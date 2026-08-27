import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import { AuthDriverState } from '../services/auth';
import { carreraDriverService } from '../services/carreraService';
import { Carrera } from '@maquitaxis/shared';
import { useTaxiTracking } from '../hooks/useTaxiTracking';

interface MisCarrerasScreenProps {
  authData: AuthDriverState;
  onBack: () => void;
}

export const MisCarrerasScreen: React.FC<MisCarrerasScreenProps> = ({ authData, onBack }) => {
  const { tercero, vehiculo } = authData;

  const [activeCarrera, setActiveCarrera] = useState<Carrera | null>(null);
  const [history, setHistory] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const { startTracking, stopTracking, isTracking, activeSession } = useTaxiTracking({ authData });

  useEffect(() => {
    loadData();

    // Suscribirse a nuevas asignaciones de carrera vía Supabase Realtime
    const unsubscribe = carreraDriverService.subscribeToAssignedCarreras(tercero.id, (carrera) => {
      if (['asignado', 'aceptado', 'en_curso'].includes(carrera.status)) {
        setActiveCarrera(carrera);
      } else {
        setActiveCarrera(null);
        loadHistory();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tercero.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadActiveCarrera(), loadHistory()]);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveCarrera = async () => {
    const carrera = await carreraDriverService.getActiveCarreraForDriver(tercero.id);
    setActiveCarrera(carrera);
  };

  const loadHistory = async () => {
    const list = await carreraDriverService.getDriverCarrerasHistory(tercero.id);
    setHistory(list);
  };

  const handleAccept = async () => {
    if (!activeCarrera) return;
    setActionLoading(true);
    try {
      await carreraDriverService.acceptCarrera(activeCarrera.id);
      Alert.alert('Carrera Aceptada', 'Dirígete al punto de origen del cliente.');
      await loadActiveCarrera();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo aceptar la carrera.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!activeCarrera) return;
    setActionLoading(true);
    try {
      // 1. Iniciar seguimiento GPS
      if (!isTracking) {
        await startTracking();
      }

      // 2. Vincular trackingSessionId a la carrera
      const sessionId = activeSession?.id || `session_${Date.now()}`;
      await carreraDriverService.startCarrera(activeCarrera.id, sessionId);

      Alert.alert('Viaje Iniciado', 'Transmitiendo ubicación GPS en tiempo real.');
      await loadActiveCarrera();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo iniciar el viaje.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeCarrera) return;
    setActionLoading(true);
    try {
      // 1. Detener seguimiento GPS
      if (isTracking) {
        await stopTracking();
      }

      // 2. Marcar carrera como completada
      await carreraDriverService.completeCarrera(activeCarrera.id);

      setActiveCarrera(null);
      Alert.alert('Viaje Finalizado', 'Carrera completada. Tu taxi vuelve a estar disponible.');
      await loadHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo finalizar la carrera.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeCarrera) return;
    Alert.alert(
      'Cancelar Servicio',
      '¿Deseas rechazar o cancelar esta carrera?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              if (isTracking) {
                await stopTracking();
              }
              await carreraDriverService.cancelCarrera(activeCarrera.id, 'Cancelado por el conductor');
              setActiveCarrera(null);
              await loadHistory();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo cancelar.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCallClient = () => {
    if (activeCarrera?.clientPhone) {
      Linking.openURL(`tel:${activeCarrera.clientPhone}`);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'pendiente':
        return { text: 'PENDIENTE', color: '#f59e0b' };
      case 'asignado':
        return { text: 'NUEVA ASIGNACIÓN', color: '#38bdf8' };
      case 'aceptado':
        return { text: 'ACEPTADO / EN CAMINO', color: '#8b5cf6' };
      case 'en_curso':
        return { text: 'VIAJE EN CURSO', color: '#10b981' };
      case 'completado':
        return { text: 'COMPLETADO', color: '#10b981' };
      case 'cancelado':
        return { text: 'CANCELADO', color: '#ef4444' };
      default:
        return { text: st.toUpperCase(), color: '#64748b' };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Servicios / Viajes</Text>
        <Text style={styles.headerPlate}>Taxi {vehiculo?.plate || '---'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator size="large" color="#f59e0b" style={{ marginVertical: 30 }} />
        ) : activeCarrera ? (
          /* Card de Carrera Activa */
          <View style={styles.activeCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.activeTitle}>🚖 CARRERA EN CURSO / ASIGNADA</Text>
              <View style={[styles.badgeChip, { backgroundColor: `${getStatusBadge(activeCarrera.status).color}25`, borderColor: getStatusBadge(activeCarrera.status).color }]}>
                <Text style={[styles.badgeChipText, { color: getStatusBadge(activeCarrera.status).color }]}>
                  {getStatusBadge(activeCarrera.status).text}
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Cliente</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.fieldValueBold}>{activeCarrera.clientName}</Text>
                <TouchableOpacity style={styles.callButton} onPress={handleCallClient}>
                  <Text style={styles.callButtonText}>📞 Llamar ({activeCarrera.clientPhone})</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Origen (Recoger en)</Text>
              <Text style={styles.fieldValue}>{activeCarrera.originAddress}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Destino</Text>
              <Text style={styles.fieldValue}>{activeCarrera.destinationAddress}</Text>
            </View>

            {activeCarrera.notes ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Observaciones</Text>
                <Text style={styles.fieldNotes}>{activeCarrera.notes}</Text>
              </View>
            ) : null}

            {/* Acciones de la carrera según su estado */}
            <View style={styles.actionsRow}>
              {actionLoading ? (
                <ActivityIndicator size="large" color="#f59e0b" style={{ marginVertical: 12 }} />
              ) : (
                <>
                  {activeCarrera.status === 'asignado' && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnAccept]} onPress={handleAccept}>
                        <Text style={styles.btnText}>ACEPTAR SERVICIO</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnCancel]} onPress={handleCancelTrip}>
                        <Text style={styles.btnText}>RECHAZAR</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {activeCarrera.status === 'aceptado' && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnStart]} onPress={handleStartTrip}>
                        <Text style={styles.btnText}>INICIAR VIAJE (EN CURSO)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.btnCancel]} onPress={handleCancelTrip}>
                        <Text style={styles.btnText}>CANCELAR</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {activeCarrera.status === 'en_curso' && (
                    <TouchableOpacity style={[styles.actionBtn, styles.btnComplete]} onPress={handleCompleteTrip}>
                      <Text style={styles.btnText}>FINALIZAR SERVICIO</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noActiveCard}>
            <Text style={styles.noActiveTitle}>⚪ Ningún Servicio Asignado Actual</Text>
            <Text style={styles.noActiveSub}>
              Estás en estado DISPONIBLE. Recibirás una notificación en tiempo real cuando el despachador te asigne una carrera.
            </Text>
          </View>
        )}

        {/* Historial de Carreras */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>HISTORIAL DE CARRERAS RECIENTES</Text>

          {history.length === 0 ? (
            <Text style={styles.emptyText}>No tienes carreras anteriores registradas.</Text>
          ) : (
            history.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <View key={item.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyClient}>{item.clientName}</Text>
                    <Text style={styles.historyRoute}>{item.originAddress} → {item.destinationAddress}</Text>
                    <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.historyBadge, { color: badge.color }]}>{badge.text}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  backButtonText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  headerPlate: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    padding: 20,
  },
  activeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#38bdf8',
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValue: {
    color: '#f8fafc',
    fontSize: 14,
  },
  fieldValueBold: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  fieldNotes: {
    color: '#f59e0b',
    fontSize: 13,
    fontStyle: 'italic',
  },
  callButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  callButtonText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 16,
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnAccept: {
    backgroundColor: '#3b82f6',
  },
  btnStart: {
    backgroundColor: '#10b981',
  },
  btnComplete: {
    backgroundColor: '#10b981',
  },
  btnCancel: {
    backgroundColor: '#ef4444',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  noActiveCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    alignItems: 'center',
  },
  noActiveTitle: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  noActiveSub: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  historyClient: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  historyRoute: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  historyDate: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  historyBadge: {
    fontSize: 11,
    fontWeight: '800',
  },
});
