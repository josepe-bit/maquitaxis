import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginScreen } from './src/screens/LoginScreen';
import { DriverHomeScreen } from './src/screens/DriverHomeScreen';
import { ProduccionScreen } from './src/screens/ProduccionScreen';
import { MisCarrerasScreen } from './src/screens/MisCarrerasScreen';
import { AuthDriverState } from './src/services/auth';
import { STORAGE_KEYS } from '@maquitaxis/shared';

type ActiveScreen = 'HOME' | 'PRODUCCION' | 'CARRERAS';

export default function App() {
  const [authState, setAuthState] = useState<AuthDriverState | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('HOME');
  const [initializing, setInitializing] = useState<boolean>(true);

  // Intentar restaurar sesión persistida al iniciar la app
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedAuth = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
        if (storedAuth) {
          const parsed: AuthDriverState = JSON.parse(storedAuth);
          setAuthState(parsed);
        }
      } catch {
        // Si hay error en parsing o storage, se requerirá login manual
      } finally {
        setInitializing(false);
      }
    };

    restoreSession();
  }, []);

  const handleLoginSuccess = async (state: AuthDriverState) => {
    setAuthState(state);
    setCurrentScreen('HOME');
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(state));
    } catch {
      // Ignorar errores de guardado de sesión
    }
  };

  const handleLogout = async () => {
    setAuthState(null);
    setCurrentScreen('HOME');
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    } catch {
      // Ignorar errores de borrado de sesión
    }
  };

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  if (!authState) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentScreen === 'PRODUCCION') {
    return (
      <ProduccionScreen
        authData={authState}
        onBack={() => setCurrentScreen('HOME')}
      />
    );
  }

  if (currentScreen === 'CARRERAS') {
    return (
      <MisCarrerasScreen
        authData={authState}
        onBack={() => setCurrentScreen('HOME')}
      />
    );
  }

  return (
    <DriverHomeScreen
      authData={authState}
      onLogout={handleLogout}
      onOpenProduccion={() => setCurrentScreen('PRODUCCION')}
      onOpenCarreras={() => setCurrentScreen('CARRERAS')}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
