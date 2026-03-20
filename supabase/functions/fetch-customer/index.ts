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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extraire le JWT Supabase pour identifier l'utilisateur
    const authHeader = req.headers.get('authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone } = await req.json();

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
            phone_number: { exact: phone },
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
          phone_number: phone,
        });
        if (createResult.customer) {
          squareCustomer = createResult.customer;
        }
      } catch (err) {
        console.error('Erreur création client Square:', err);
      }
    }

    // 3. Mettre à jour le profil Supabase avec le Square Customer ID
    if (squareCustomer) {
      // Chercher l'utilisateur Supabase par téléphone
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .limit(1);

      if (profiles && profiles.length > 0) {
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
          .eq('id', profiles[0].id);
      }
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('fetch-customer error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
