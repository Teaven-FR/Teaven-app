// Edge Function — Récupérer ou créer un client Square à partir du téléphone
// Retourne les infos client : squareCustomerId, fullName, email
// + crée le client Square s'il n'existe pas encore

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SQUARE_BASE_URL = Deno.env.get('SQUARE_ENVIRONMENT') === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') ?? '';
const SQUARE_VERSION = '2025-01-23';

/** Appel générique Square API */
async function squareFetch(path: string, method: string, body?: Record<string, unknown>) {
  const res = await fetch(`${SQUARE_BASE_URL}${path}`, {
    method,
    headers: {
      'Square-Version': SQUARE_VERSION,
      'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/** Vérifie le JWT Supabase et retourne l'utilisateur authentifié */
async function authenticateUser(req: Request) {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Authentification requise
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { phone } = body;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'phone est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Chercher le client dans Square par téléphone
    let squareCustomer = null;
    try {
      const searchResult = await squareFetch('/v2/customers/search', 'POST', {
        query: {
          filter: {
            phone_number: { exact: phone as string },
          },
        },
      });
      if (searchResult.customers && searchResult.customers.length > 0) {
        squareCustomer = searchResult.customers[0];
      }
    } catch (err) {
      console.error('Erreur recherche client Square:', err);
    }

    // 2. Si pas trouvé, créer le client Square
    if (!squareCustomer) {
      try {
        const createResult = await squareFetch('/v2/customers', 'POST', {
          idempotency_key: crypto.randomUUID(),
          phone_number: phone as string,
        });
        if (createResult.customer) {
          squareCustomer = createResult.customer;
        }
      } catch (err) {
        console.error('Erreur création client Square:', err);
      }
    }

    // 3. Mettre à jour le profil Supabase avec le Square Customer ID
    // Only update the authenticated user's own profile
    if (squareCustomer) {
      await supabase
        .from('profiles')
        .update({
          square_customer_id: squareCustomer.id,
          full_name: squareCustomer.given_name
            ? `${squareCustomer.given_name} ${squareCustomer.family_name ?? ''}`.trim()
            : undefined,
          email: squareCustomer.email_address ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id);
    }

    // 4. Retourner les données client
    return new Response(
      JSON.stringify({
        success: true,
        customer: squareCustomer
          ? {
              squareCustomerId: squareCustomer.id,
              fullName: squareCustomer.given_name
                ? `${squareCustomer.given_name} ${squareCustomer.family_name ?? ''}`.trim()
                : '',
              email: squareCustomer.email_address ?? null,
              phone: squareCustomer.phone_number ?? phone,
              createdAt: squareCustomer.created_at,
            }
          : null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('fetch-customer error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
