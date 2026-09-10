const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Jpabon1.Jpa@db.uoytcdccwpezzstrndcz.supabase.co:5432/postgres';

async function applyMigration() {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20260910000000_add_last_change_info_to_alerts_rpc.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Try direct connection or with ssl
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando a la base de datos de Supabase Cloud vía PostgreSQL...');
    await client.connect();
    console.log('Conexión exitosa. Ejecutando la actualización de la función RPC public.get_vehicle_event_alerts()...');
    await client.query(sql);
    console.log('RPC public.get_vehicle_event_alerts() actualizada exitosamente en Supabase Cloud!');
  } catch (err) {
    console.error('Error al ejecutar la migración en Postgres:', err);
  } finally {
    await client.end();
  }
}

applyMigration();
