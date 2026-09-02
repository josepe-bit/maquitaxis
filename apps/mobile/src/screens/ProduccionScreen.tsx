import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { AuthDriverState } from '../services/auth';
import { produccionService } from '../services/produccionService';
import { ProduccionDiaria, ProductionStatus, ShiftType, DriverSavingsSummary } from '@maquitaxis/shared';

interface ProduccionScreenProps {
  authData: AuthDriverState;
  onBack: () => void;
}

export const ProduccionScreen: React.FC<ProduccionScreenProps> = ({ authData, onBack }) => {
  const { tercero, vehiculo } = authData;
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [shift, setShift] = useState<ShiftType>('dia');
  const [amountStr, setAmountStr] = useState<string>(vehiculo?.dailyFee ? String(vehiculo.dailyFee) : '0');
  const [deductionStr, setDeductionStr] = useState<string>('0');
  const [status, setStatus] = useState<ProductionStatus>('trabajo');
  const [mileageStr, setMileageStr] = useState<string>('');
  const [savingsStr, setSavingsStr] = useState<string>(vehiculo?.savingsAmount ? String(vehiculo.savingsAmount) : '0');

  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(true);
  const [history, setHistory] = useState<ProduccionDiaria[]>([]);
  const [savingsSummary, setSavingsSummary] = useState<DriverSavingsSummary | null>(null);
  const [assignedShifts, setAssignedShifts] = useState<ShiftType[]>(['dia', 'noche']);

  const amount = Number(amountStr) || 0;
  const deduction = Number(deductionStr) || 0;
  const netAmount = amount - deduction;

  useEffect(() => {
    if (vehiculo?.id && tercero?.id) {
      produccionService.getAssignedTurnos(vehiculo.id, tercero.id).then((shifts) => {
        if (shifts && shifts.length > 0) {
          setAssignedShifts(shifts);
          if (!shifts.includes(shift)) {
            setShift(shifts[0]);
          }
        }
      });
    }
  }, [vehiculo?.id, tercero?.id]);

  useEffect(() => {
    loadData();
  }, [vehiculo?.id, date, shift]);


  const loadData = async () => {
    if (!vehiculo?.id) return;
    setFetchingHistory(true);
    try {
      // 1. Cargar producido existente para esta fecha y turno
      const existing = await produccionService.getProduccionByDate(vehiculo.id, date, shift);
      if (existing) {
        setAmountStr(String(existing.amount));
        setDeductionStr(String(existing.deduction));
        setStatus(existing.status);
        setMileageStr(existing.mileage ? String(existing.mileage) : '');
        setSavingsStr(existing.savingsAmount ? String(existing.savingsAmount) : '0');
      }

      // 2. Cargar historial
      const list = await produccionService.getProduccionHistory(vehiculo.id);
      setHistory(list);

      // 3. Cargar resumen de ahorro consolidado del conductor
      if (tercero?.id) {
        const summary = await produccionService.getDriverSavingsSummary(tercero.id);
        setSavingsSummary(summary);
      }
    } catch {
      // Ignorar errores en carga inicial
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleSave = async () => {
    if (!vehiculo?.id) {
      Alert.alert('Error', 'No hay ningún vehículo asignado a este conductor.');
      return;
    }

    if (!date.trim()) {
      Alert.alert('Error', 'Por favor ingrese una fecha válida.');
      return;
    }

    setLoading(true);
    try {
      await produccionService.saveProduccion({
        vehiculoId: vehiculo.id,
        date: date.trim(),
        shift: shift,
        driverId: tercero?.id,
        amount: Number(amountStr) || 0,
        deduction: Number(deductionStr) || 0,
        status: status,
        mileage: Number(mileageStr) || 0,
        savingsAmount: Number(savingsStr) || 0,
      });

      Alert.alert('Éxito', `Producción del ${date} (Turno ${shift.toUpperCase()}) registrada correctamente.`);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo registrar la producción.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (st: ProductionStatus) => {
    switch (st) {
      case 'trabajo':
        return { text: 'TRABAJO', color: '#10b981' };
      case 'pico_y_placa':
        return { text: 'PICO Y PLACA', color: '#f59e0b' };
      case 'taller':
        return { text: 'TALLER', color: '#ef4444' };
      case 'descanso':
        return { text: 'DESCANSO', color: '#38bdf8' };
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
        <Text style={styles.headerTitle}>Producción Diaria</Text>
        <Text style={styles.headerPlate}>Taxi {vehiculo?.plate || '---'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Banner de Ahorro Acumulado Consolidado del Conductor */}
        {savingsSummary && (
          <View style={styles.savingsBanner}>
            <Text style={styles.savingsBannerTitle}>🐷 MI AHORRO ACUMULADO DISPONIBLE</Text>
            <Text style={styles.savingsBannerAmount}>
              ${savingsSummary.availableBalance.toLocaleString('es-CO')} COP
            </Text>
            <Text style={styles.savingsBannerSub}>
              Acumulado total de tus turnos (Generado: ${savingsSummary.totalGenerated.toLocaleString()} | Devuelto: ${savingsSummary.totalReturned.toLocaleString()})
            </Text>
          </View>
        )}

        {/* Card Formulario */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>REGISTRO DE PRODUCIDO POR TURNO</Text>

          {/* Selector de Turno (Día / Noche) */}
          <Text style={styles.label}>Turno de Trabajo</Text>
          <View style={styles.shiftContainer}>
            <TouchableOpacity
              style={[
                styles.shiftButton,
                shift === 'dia' && styles.shiftActiveDay,
                !assignedShifts.includes('dia') && { opacity: 0.3 }
              ]}
              onPress={() => assignedShifts.includes('dia') && setShift('dia')}
              disabled={!assignedShifts.includes('dia')}
              activeOpacity={0.8}
            >
              <Text style={[styles.shiftText, shift === 'dia' && styles.shiftTextActiveDay]}>
                ☀️ TURNO DÍA {!assignedShifts.includes('dia') && '(No asignado)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shiftButton,
                shift === 'noche' && styles.shiftActiveNight,
                !assignedShifts.includes('noche') && { opacity: 0.3 }
              ]}
              onPress={() => assignedShifts.includes('noche') && setShift('noche')}
              disabled={!assignedShifts.includes('noche')}
              activeOpacity={0.8}
            >
              <Text style={[styles.shiftText, shift === 'noche' && styles.shiftTextActiveNight]}>
                🌙 TURNO NOCHE {!assignedShifts.includes('noche') && '(No asignado)'}
              </Text>
            </TouchableOpacity>
          </View>


          {/* Selector de Estado Operacional */}
          <Text style={styles.label}>Estado de la Jornada</Text>
          <View style={styles.statusGrid}>
            {(['trabajo', 'pico_y_placa', 'taller', 'descanso'] as ProductionStatus[]).map((st) => {
              const badge = getStatusBadge(st);
              const isSelected = status === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusChip,
                    isSelected && { borderColor: badge.color, backgroundColor: `${badge.color}25` },
                  ]}
                  onPress={() => setStatus(st)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusChipText, isSelected && { color: badge.color, fontWeight: '700' }]}>
                    {badge.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fecha y Cuota Base */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Fecha</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Cuota Producido ($)</Text>
              <TextInput
                style={styles.input}
                value={amountStr}
                onChangeText={setAmountStr}
                keyboardType="numeric"
                placeholder="Ej: 110000"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          {/* Deducciones y Ahorro */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Deducciones ($)</Text>
              <TextInput
                style={styles.input}
                value={deductionStr}
                onChangeText={setDeductionStr}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Ahorro ($)</Text>
              <TextInput
                style={styles.input}
                value={savingsStr}
                onChangeText={setSavingsStr}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          {/* Kilometraje Final */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kilometraje Final del Carro (Km)</Text>
            <TextInput
              style={styles.input}
              value={mileageStr}
              onChangeText={setMileageStr}
              keyboardType="numeric"
              placeholder="Ej: 145200"
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Cálculo del Neto */}
          <View style={styles.netContainer}>
            <Text style={styles.netLabel}>PRODUCIDO NETO FINAL:</Text>
            <Text style={[styles.netValue, netAmount < 0 && { color: '#ef4444' }]}>
              ${netAmount.toLocaleString('es-CO')} COP
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.saveButtonText}>GUARDAR PRODUCCIÓN</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Historial Reciente */}
        <View style={styles.historyCard}>
          <Text style={styles.cardTitle}>HISTORIAL RECIENTE</Text>

          {fetchingHistory ? (
            <ActivityIndicator color="#f59e0b" style={{ marginVertical: 12 }} />
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>No hay registros anteriores para este taxi.</Text>
          ) : (
            history.map((item) => {
              const badge = getStatusBadge(item.status);
              const itemNet = item.amount - item.deduction;
              return (
                <View key={item.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>
                      {item.date} ({item.shift ? item.shift.toUpperCase() : 'DÍA'})
                    </Text>
                    <Text style={[styles.historyStatus, { color: badge.color }]}>{badge.text}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.historyNet}>${itemNet.toLocaleString('es-CO')}</Text>
                    <Text style={styles.historyDetail}>
                      Cuota: ${item.amount.toLocaleString()} | Ded: ${item.deduction.toLocaleString()}
                    </Text>
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
    backgroundColor: '#1e293b',
  },
  backButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  headerPlate: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    padding: 16,
  },
  savingsBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  savingsBannerTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  savingsBannerAmount: {
    color: '#34d399',
    fontSize: 24,
    fontWeight: '800',
    marginVertical: 4,
  },
  savingsBannerSub: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  shiftContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  shiftButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
    alignItems: 'center',
  },
  shiftActiveDay: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  shiftActiveNight: {
    borderColor: '#c084fc',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  shiftText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  shiftTextActiveDay: {
    color: '#f59e0b',
    fontWeight: '800',
  },
  shiftTextActiveNight: {
    color: '#c084fc',
    fontWeight: '800',
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  statusChipText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  netContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 12,
  },
  netLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  netValue: {
    color: '#34d399',
    fontSize: 16,
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
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
    borderBottomColor: '#334155',
  },
  historyDate: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  historyNet: {
    color: '#34d399',
    fontSize: 14,
    fontWeight: '700',
  },
  historyDetail: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
});
