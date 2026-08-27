import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
} from 'react-native';
import { authDriverService, AuthDriverState } from '../services/auth';

interface LoginScreenProps {
  onLoginSuccess: (state: AuthDriverState) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [docNumber, setDocNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    if (!docNumber.trim()) {
      setErrorMessage('Por favor ingrese su número de documento.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor ingrese su contraseña.');
      return;
    }

    setLoading(true);
    try {
      const authState = await authDriverService.loginWithDocument(docNumber, password);
      onLoginSuccess(authState);
    } catch (err: any) {
      let msg = err.message || 'Error al iniciar sesión.';
      if (msg.toLowerCase().includes('not confirmed') || msg.toLowerCase().includes('confirm')) {
        msg = 'Tu correo electrónico aún no ha sido verificado. Por favor revisa tu bandeja de entrada o presiona "Reenviar Correo de Verificación".';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    Alert.prompt(
      'Reenviar Correo de Verificación',
      'Ingresa tu correo electrónico registrado:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar Enlace',
          onPress: async (emailInput?: string) => {
            if (!emailInput || !emailInput.includes('@')) {
              Alert.alert('Error', 'Ingresa un correo electrónico válido.');
              return;
            }
            try {
              await authDriverService.resendVerificationEmail(emailInput.trim());
              Alert.alert('¡Enlace Enviado!', 'Revisa tu correo electrónico para verificar tu cuenta e iniciar sesión.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo reenviar el correo de verificación.');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  /**
   * Opción de ingreso demo rápido para desarrollo y pruebas locales (Conductor Jose Omar - Taxi SMR842)
   */
  const handleQuickDemoLogin = () => {
    onLoginSuccess({
      tercero: {
        id: 'c3333333-3333-3333-3333-333333333333',
        docType: 'CC',
        docNumber: '85412369',
        name: 'Jose Omar Conductor',
        phone: '+573015554433',
        email: 'joseomar@maquitaxis.com',
        driverLicenseNumber: 'C1-8429102',
        isOwner: false,
        isServiceClient: false,
        isDriver: true,
        isSupplier: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      vehiculo: {
        id: 'v1111111-1111-1111-1111-111111111111',
        plate: 'SMR842',
        ownerId: 'c2222222-2222-2222-2222-222222222222',
        servicioId: 's2222222-2222-2222-2222-222222222222',
        model: '2022',
        displacement: '1.2L',
        fuelType: 'Gasolina/Gas',
        passengerCapacity: 4,
        driverId: 'c3333333-3333-3333-3333-333333333333',
        dailyFee: 110000,
        savingsAmount: 10000,
        status: 'disponible',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.logoBadge}>🚕 MaquiTaxis</Text>
          <Text style={styles.title}>Ingreso Conductor</Text>
          <Text style={styles.subtitle}>Ingrese con su número de documento registrado</Text>
        </View>

        <View style={styles.form}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {(errorMessage.toLowerCase().includes('verificad') ||
                errorMessage.toLowerCase().includes('confirm')) && (
                <TouchableOpacity
                  style={{
                    marginTop: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#38bdf8',
                    alignItems: 'center',
                  }}
                  onPress={handleResendEmail}
                >
                  <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '700' }}>
                    📧 Reenviar Correo de Verificación
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Número de Documento</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 85412369"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={docNumber}
              onChangeText={setDocNumber}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña / PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>MODO DE PRUEBA</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleQuickDemoLogin}
            activeOpacity={0.8}
          >
            <Text style={styles.demoButtonText}>⚡ Ingreso Rápido (Jose Omar - Taxi SMR842)</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    color: '#f59e0b',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fafc',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
  },
  demoButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
});
