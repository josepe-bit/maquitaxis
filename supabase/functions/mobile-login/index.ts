import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const docNumber = body?.docNumber;
    const password = body?.password;
    const cleanDoc = typeof docNumber === 'string' ? docNumber.trim() : '';

    if (!cleanDoc || !password || typeof password !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey);

    // 1. Buscar tercero internamente usando el cliente Service Role
    const { data: tercero } = await adminClient
      .from('terceros')
      .select('id, user_id, email, is_driver, is_owner')
      .eq('doc_number', cleanDoc)
      .maybeSingle();

    if (!tercero || (!tercero.is_driver && !tercero.is_owner)) {
      return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Resolver el identificador/email de Supabase Auth
    let userEmail: string | undefined = tercero.email ? tercero.email.trim() : undefined;

    if (!userEmail && tercero.user_id) {
      const { data: authUserResponse } = await adminClient.auth.admin.getUserById(tercero.user_id);
      if (authUserResponse?.user?.email) {
        userEmail = authUserResponse.user.email.trim();
      }
    }

    if (!userEmail) {
      userEmail = `doc_${cleanDoc}@maquitaxis.local`;
    }

    // 3. Autenticar con el cliente público (Anon Key)
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

    if (authError || !authData.session) {
      return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Retornar únicamente la sesión y el usuario oficialmente autenticados
    return new Response(
      JSON.stringify({
        session: authData.session,
        user: authData.user,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
