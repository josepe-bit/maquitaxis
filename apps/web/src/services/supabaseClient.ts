import { createClient } from '@supabase/supabase-js';
import type { Database } from '@maquitaxis/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Exportación como `supabase` para mantener compatibilidad con servicios existentes
export const supabase = supabaseClient;

export default supabaseClient;
