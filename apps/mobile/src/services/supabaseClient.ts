import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@maquitaxis/shared';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Diagnostic log seguro (sin exponer la anon key completa)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[SUPABASE CLIENT INIT]', {
    hasUrl: !!supabaseUrl,
    urlHost: supabaseUrl ? supabaseUrl.replace(/https?:\/\//, '').split('/')[0] : 'DESCONOCIDA',
    hasAnonKey: !!supabaseAnonKey,
    keyLength: supabaseAnonKey?.length || 0,
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 15) + '...' : 'DESCONOCIDA',
  });
}

if (!supabaseUrl) {
  throw new Error(
    'Falta la variable de entorno EXPO_PUBLIC_SUPABASE_URL. Verifica la configuración en apps/mobile/.env para desarrollo local o en eas.json / EAS Environment Variables para EAS Build.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Falta la variable de entorno EXPO_PUBLIC_SUPABASE_ANON_KEY. Verifica la configuración en apps/mobile/.env para desarrollo local o en eas.json / EAS Environment Variables para EAS Build.'
  );
}

// Custom fetch wrapper para capturar TypeError: NetworkError amigablemente
const customFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error: any) {
    if (error?.name === 'TypeError' || error?.message?.includes('fetch')) {
      throw new Error(
        'Error de conexión con el servidor Supabase. Comprueba tu conexión a internet o la variable EXPO_PUBLIC_SUPABASE_URL en apps/mobile/.env.'
      );
    }
    throw error;
  }
};

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: customFetch,
  },
});

// Exportación como `supabase` para mantener compatibilidad con servicios existentes
export const supabase = supabaseClient;

export default supabaseClient;

