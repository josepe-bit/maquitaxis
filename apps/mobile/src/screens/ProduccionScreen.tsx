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
  FlatList,
} from 'react-native';
import { AuthDriverState } from '../services/auth';
import { produccionService } from '../services/produccionService';
import { ProduccionDiaria, ProductionStatus } from '@maquitaxis/shared';

interface ProduccionScreenProps {
  authData: AuthDriverState;
  onBack: () => void;
}

export const ProduccionScreen: React.FC<ProduccionScreenProps> = ({ authData, onBack }) => {
  const { tercero, vehiculo } = authData;
  const todayStr = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState<string>(todayStr);
  const [amountStr, setAmountStr] = useState<string>(vehiculo?.dailyFee ? String(vehiculo.dailyFee) : '0');
  const [deductionStr, setDeductionStr] = useState<string>('0');
  const [status, setStatus] = useState<ProductionStatus>('trabajo');
  const [mileageStr, setMileageStr] = useState<string>('');
  const [savingsStr, setSavingsStr] = useState<string>(vehiculo?.savingsAmount ? String(vehiculo.savingsAmount) : '0');

  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(true);
  const [history, setHistory] = useState<ProduccionDiaria[]>([]);

  const amount = Number(amountStr) || 0;
  const deduction = Number(deductionStr) || 0;
  const netAmount = amount - deduction;

  useEffect(() => {
    if (vehiculo?.id) {
      loadTodayProduccionAndHistory();
    }
  }, [vehiculo?.id, date]);

  const loadTodayProduccionAndHistory = async () => {
    if (!vehiculo?.id) return;
    setFetchingHistory(true);
    try {
      // 1. Cargar producción ya guardada para hoy si existe
      const todayProd = await produccionService.getProduccionByDate(vehiculo.id, date);
      if (todayProd) {
        setAmountStr(String(todayProd.amount));
        setDeductionStr(String(todayProd.deduction));
        setStatus(todayProd.status);
        setMileageStr(todayProd.mileage ? String(todayProd.mileage) : '');
        setSavingsStr(todayProd.savingsAmount ? String(todayProd.savingsAmount) : '0');
      }

      // 2. Cargar historial reciente
      const list = await produccionService.getProduccionHistory(vehiculo.id);
      setHistory(list);
    } catch {
      // Manejar error silenciosamente
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
        amount: Number(amountStr) || 0,
        deduction: Number(deductionStr) || 0,
        status: status,
        mileage: Number(mileageStr) || 0,
        savingsAmount: Number(savingsStr) || 0,
      });

      Alert.alert('Éxito', `Producción del día ${date} registrada correctamente.`);
      await loadTodayProduccionAndHistory();
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
        {/* Card Formulario */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>REGISTRO DE PRODUCIDO</Text>

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
                    <Text style={styles.historyDate}>{item.date}</Text>
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
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  cardTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.5,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0f172a',
  },
  statusChipText: {
    color: '#94a3b8',
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 14,
  },
  netContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  netLabel: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  netValue: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  historyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
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
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  historyDate: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  historyNet: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '800',
  },
  historyDetail: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
});
