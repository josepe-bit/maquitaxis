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
      .select('id, user_id, email, is_driver, is_owner, access_status')
      .eq('doc_number', cleanDoc)
      .maybeSingle();

    // CASO A: Tercero administrativo sin usuario (user_id IS NULL)
    if (tercero && !tercero.user_id) {
      return new Response(
        JSON.stringify({ error: 'El número de identificación ya se encuentra registrado. Comunícate con el Administrador para activar tu cuenta.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // CASO C y D: Tercero existe con usuario en estado pending o rejected
    if (tercero && tercero.user_id) {
      if (tercero.access_status === 'pending') {
        return new Response(
          JSON.stringify({ error: 'Tu cuenta está pendiente de aprobación por el administrador.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (tercero.access_status === 'rejected') {
        return new Response(
          JSON.stringify({ error: 'Tu acceso a MaquiTaxis no está autorizado. Comunícate con el administrador.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (tercero.access_status !== 'approved' || (!tercero.is_driver && !tercero.is_owner)) {
        return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // CASO F: Tercero no existe aún en public.terceros (Conductor nuevo registrado vía mobile)
    if (!tercero) {
      // Buscar usuario en auth.users por docNumber en metadata o email
      const { data: usersList } = await adminClient.auth.admin.listUsers();
      const matchedUser = (usersList?.users || []).find(
        (u) => u.user_metadata?.docNumber === cleanDoc || u.email?.startsWith(`doc_${cleanDoc}@`)
      );

      if (!matchedUser || !matchedUser.email) {
        return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Autenticar la contraseña con el cliente anon
      const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
        email: matchedUser.email,
        password: password,
      });

      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: 'Invalid login credentials' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verificar si el correo ya fue confirmado
      if (!authData.user.email_confirmed_at) {
        return new Response(
          JSON.stringify({ error: 'Tu correo electrónico aún no ha sido verificado. Por favor revisa tu bandeja de entrada.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Crear registro inicial del tercero en public.terceros con access_status = 'pending' y requested_role = 'CONDUCTOR'
      const { error: insertErr } = await adminClient.from('terceros').insert({
        doc_type: matchedUser.user_metadata?.docType || 'CC',
        doc_number: cleanDoc,
        name: matchedUser.user_metadata?.name || matchedUser.email.split('@')[0],
        phone: matchedUser.user_metadata?.phone || null,
        email: matchedUser.email,
        user_id: authData.user.id,
        requested_role: 'CONDUCTOR',
        is_owner: false,
        is_service_client: false,
        is_driver: false,
        is_supplier: false,
        access_status: 'pending',
      });

      if (insertErr) {
        console.error('Error al insertar tercero pending en mobile-login:', insertErr);
      }

      // Desconectar la sesión temporal creada durante la autenticación de validación
      await authClient.auth.signOut().catch(() => {});

      return new Response(
        JSON.stringify({ error: 'Tu cuenta está pendiente de aprobación por el administrador.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Resolver el email para tercero aprobado existente
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

    // 3. Autenticar tercero aprobado con cliente Anon Key
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
