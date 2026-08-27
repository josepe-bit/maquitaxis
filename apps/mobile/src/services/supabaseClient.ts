import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@maquitaxis/shared';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

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
