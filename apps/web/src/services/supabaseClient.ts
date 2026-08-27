import { createClient } from '@supabase/supabase-js';
import type { Database } from '@maquitaxis/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

// Custom fetch wrapper para capturar TypeError: NetworkError amigablemente
const customFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error: any) {
    if (error?.name === 'TypeError' || error?.message?.includes('fetch')) {
      throw new Error(
        'Error de conexión con el servidor Supabase. Verifica que el servidor esté activo y que VITE_SUPABASE_URL en apps/web/.env contenga la URL correcta.'
      );
    }
    throw error;
  }
};

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch,
  },
});

// Exportación como `supabase` para mantener compatibilidad con servicios existentes
export const supabase = supabaseClient;

export default supabaseClient;
