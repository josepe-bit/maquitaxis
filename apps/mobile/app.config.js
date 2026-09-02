module.exports = ({ config }) => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const isUrlPresent = !!supabaseUrl;
  const isKeyPresent = !!supabaseAnonKey;
  const keyPrefix = isKeyPresent ? supabaseAnonKey.substring(0, 15) + '...' : 'AUSENTE';
  const keyLen = isKeyPresent ? supabaseAnonKey.length : 0;

  console.log('\n🔍 [EAS BUILD ENV CHECK] Verificando variables de entorno Supabase Mobile:');
  console.log(`   - EXPO_PUBLIC_SUPABASE_URL: ${isUrlPresent ? '🟢 CONFIGURADA (' + supabaseUrl + ')' : '🔴 FALTANTE'}`);
  console.log(`   - EXPO_PUBLIC_SUPABASE_ANON_KEY: ${isKeyPresent ? '🟢 CONFIGURADA (Longitud: ' + keyLen + ' chars, Prefijo: ' + keyPrefix + ')' : '🔴 FALTANTE'}\n`);

  return {
    ...config,
  };
};
