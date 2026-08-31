import { createClient } from '@supabase/supabase-js';
import type { Database } from '@maquitaxis/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Falta la variable de entorno VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Falta la variable de entorno VITE_SUPABASE_ANON_KEY');
}

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

export const supabase = supabaseClient;

export default supabaseClient;

