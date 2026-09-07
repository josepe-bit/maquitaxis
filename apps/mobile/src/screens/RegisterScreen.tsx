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
  ScrollView,
} from 'react-native';
import { authDriverService } from '../services/auth';

interface RegisterScreenProps {
  onBackToLogin: () => void;
}

const DOC_TYPES = ['CC', 'CE', 'PASAPORTE', 'NIT'];

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onBackToLogin }) => {
  const [docType, setDocType] = useState<string>('CC');
  const [docNumber, setDocNumber] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!docNumber.trim()) {
      setErrorMessage('El número de documento es obligatorio.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('El nombre completo es obligatorio.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor ingrese un correo electrónico válido.');
      return;
    }
    if (!password) {
      setErrorMessage('La contraseña es obligatoria.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await authDriverService.registerDriver({
        docType,
        docNumber: docNumber.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim(),
        password,
      });

      setSuccessMessage(res.message);
    } catch (err: any) {
      let msg = err.message || 'Error al registrar usuario.';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        msg = 'El correo electrónico o número de documento ya se encuentra registrado.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logoBadge}>🚕 MaquiTaxis</Text>
            <Text style={styles.title}>Registro de Conductor</Text>
            <Text style={styles.subtitle}>Complete sus datos para solicitar acceso a la aplicación</Text>
          </View>

          <View style={styles.form}>
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage ? (
              <View style={styles.successContainer}>
                <Text style={styles.successTitle}>¡Solicitud Recibida!</Text>
                <Text style={styles.successText}>{successMessage}</Text>
                <TouchableOpacity style={styles.backButtonSuccess} onPress={onBackToLogin} activeOpacity={0.8}>
                  <Text style={styles.backButtonSuccessText}>IR AL INICIO DE SESIÓN</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tipo de Documento</Text>
                  <View style={styles.docTypeSelector}>
                    {DOC_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.docTypeOption, docType === type && styles.docTypeOptionSelected]}
                        onPress={() => setDocType(type)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.docTypeText, docType === type && styles.docTypeTextSelected]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Número de Documento *</Text>
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
                  <Text style={styles.label}>Nombre Completo *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Juan Pérez"
                    placeholderTextColor="#64748b"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Teléfono Móvil (Opcional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 3001234567"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Correo Electrónico *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="conductor@ejemplo.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Contraseña *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.buttonText}>SOLICITAR REGISTRO</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={onBackToLogin} activeOpacity={0.7}>
                  <Text style={styles.secondaryButtonText}>¿Ya tienes una cuenta? Inicia Sesión</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
  successContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  successTitle: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  successText: {
    color: '#f8fafc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  backButtonSuccess: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  backButtonSuccessText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  docTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  docTypeOption: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  docTypeOptionSelected: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  docTypeText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  docTypeTextSelected: {
    color: '#0f172a',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
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
  secondaryButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },
});
