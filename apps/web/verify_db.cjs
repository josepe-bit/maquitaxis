const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uoytcdccwpezzstrndcz.supabase.co';
const supabaseKey = 'sb_publishable_rJeyy0GiC94I5hp_dVb_qQ_HW65mAj5';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRPC() {
  console.log('=== VERIFICACIÓN EN SUPABASE CLOUD ===');
  
  // 1. Verificar registros reales en tabla control (con servicio de consulta)
  const { data: controles, error: ctrlErr } = await supabase
    .from('control')
    .select(`
      id,
      date,
      current_mileage,
      next_change_mileage,
      next_change_date,
      evento_id,
      vehiculo_id,
      evento:eventos(name),
      vehiculo:vehiculos(plate)
    `)
    .order('created_at', { ascending: false });

  console.log('Filas de control obtenidas:', controles ? controles.length : 0);
  if (controles && controles.length > 0) {
    console.log('Primer registro real de control:');
    console.log({
      id: controles[0].id,
      date: controles[0].date,
      current_mileage: controles[0].current_mileage,
      next_change_mileage: controles[0].next_change_mileage,
      plate: controles[0].vehiculo?.plate,
      evento: controles[0].evento?.name
    });
  }

  // 2. Verificar función RPC y sus columnas devueltas
  // Nota: get_vehicle_event_alerts() requiere auth.uid() en runtime.
}

verifyRPC();
