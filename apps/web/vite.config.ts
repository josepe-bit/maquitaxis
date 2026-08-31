import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function analyzeKey(label: string, val: string | undefined) {
  if (!val) {
    console.log(`\n========================================`);
    console.log(`[DIAGNOSTICO BUILD VERCEL] ${label}`);
    console.log(`Existe: NO`);
    console.log(`========================================\n`);
    return;
  }
  const length = val.length;
  const leadingSpaces = length - val.trimStart().length;
  const trailingSpaces = length - val.trimEnd().length;
  const newlines = (val.match(/\r|\n/g) || []).length;
  const jwtHeaderMatches = val.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/g) || [];
  const jwtHeaderCount = jwtHeaderMatches.length;

  console.log(`\n========================================`);
  console.log(`[DIAGNOSTICO BUILD VERCEL] ${label}`);
  console.log(`Existe: SÍ`);
  console.log(`Longitud total: ${length} caracteres`);
  console.log(`Espacios al inicio: ${leadingSpaces}`);
  console.log(`Espacios al final: ${trailingSpaces}`);
  console.log(`Saltos de línea: ${newlines}`);
  console.log(`Ocurrencias de encabezado JWT: ${jwtHeaderCount}`);
  console.log(`Estimación tokens concatenados: ${jwtHeaderCount} JWT(s)`);
  console.log(`========================================\n`);
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  analyzeKey('process.env.VITE_SUPABASE_ANON_KEY', process.env.VITE_SUPABASE_ANON_KEY);
  analyzeKey('loadEnv.VITE_SUPABASE_ANON_KEY', env.VITE_SUPABASE_ANON_KEY);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@maquitaxis/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
  };
});


