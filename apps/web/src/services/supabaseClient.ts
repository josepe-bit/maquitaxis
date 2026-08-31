import { createClient } from '@supabase/supabase-js';
import type { Database } from '@maquitaxis/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl) {
  throw new Error('Falta VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Falta VITE_SUPABASE_ANON_KEY');
}

console.log('[SUPABASE CONFIG TEST]', {
  url: supabaseUrl,
  keyStartsWithSb: supabaseAnonKey.startsWith('sb_'),
  keyLength: supabaseAnonKey.length,
  hasNewline: /[\r\n]/.test(supabaseAnonKey),
  hasWhitespace: /\s/.test(supabaseAnonKey),
});

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

export const supabase = supabaseClient;

export default supabaseClient;


