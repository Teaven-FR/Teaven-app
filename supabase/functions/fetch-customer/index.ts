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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Récupérer l'utilisateur authentifié (optionnel — utilisé pour update profile)
    const authUser = await authenticateUser(req);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { phone, action, updates } = body as {
      phone?: string;
      action?: 'fetch' | 'update';
      updates?: {
        address?: { address_line_1?: string; locality?: string; postal_code?: string; country?: string };
        birthday?: string;
        email?: string;
        givenName?: string;
        familyName?: string;
      };
    };

    // ── Action UPDATE : mettre à jour un customer Square ──
    if (action === 'update' && authUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('square_customer_id')
        .eq('id', authUser.id)
        .single();

      if (!profile?.square_customer_id) {
        return new Response(
          JSON.stringify({ error: 'Pas de client Square lié' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const updateBody: Record<string, unknown> = {};
      if (updates?.address) updateBody.address = updates.address;
      if (updates?.birthday) updateBody.birthday = updates.birthday;
      if (updates?.email) updateBody.email_address = updates.email;
      if (updates?.givenName) updateBody.given_name = updates.givenName;
      if (updates?.familyName) updateBody.family_name = updates.familyName;

      const updateResult = await squareFetch(`/v2/customers/${profile.square_customer_id}`, 'PUT', updateBody);
      return new Response(
        JSON.stringify({ success: true, customer: updateResult.customer }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'phone est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Chercher le client dans Square par téléphone — recherche exhaustive
    //    Normalise puis génère toutes les variantes probables pour éviter les doublons.
    let squareCustomer = null;
    let searchFailed = false;
    try {
      const phoneStr = phone as string;
      const digits = phoneStr.replace(/[^\d]/g, ''); // juste les chiffres
      const variants = new Set<string>();
      variants.add(phoneStr);

      // Normalisation France
      if (digits.startsWith('33') && digits.length === 11) {
        variants.add('+' + digits);         // +33XXXXXXXXX
        variants.add(digits);               // 33XXXXXXXXX
        variants.add('0' + digits.slice(2)); // 0XXXXXXXXX
      } else if (digits.startsWith('0') && digits.length === 10) {
        variants.add(digits);               // 0XXXXXXXXX
        variants.add('33' + digits.slice(1));  // 33XXXXXXXXX
        variants.add('+33' + digits.slice(1)); // +33XXXXXXXXX
      } else if (digits.length === 9) {
        variants.add('0' + digits);
        variants.add('33' + digits);
        variants.add('+33' + digits);
      }

      for (const variant of variants) {
        const searchResult = await squareFetch('/v2/customers/search', 'POST', {
          query: { filter: { phone_number: { exact: variant } } },
        });
        if (searchResult?.errors?.length) {
          // Token invalide ou API down → ne pas créer de doublon par défaut
          console.error('Square search error:', searchResult.errors);
          searchFailed = true;
          break;
        }
        if (searchResult.customers && searchResult.customers.length > 0) {
          squareCustomer = searchResult.customers[0];
          break;
        }
      }
    } catch (err) {
      console.error('Erreur recherche client Square:', err);
      searchFailed = true;
    }

    // 2. Si pas trouvé ET search a réussi, créer le client Square.
    //    Si search a échoué (token KO, réseau KO) : on N'ABSOLUMENT PAS créer
    //    de nouveau customer (risque de doublon), on remonte l'erreur.
    if (!squareCustomer && searchFailed) {
      return new Response(
        JSON.stringify({ error: 'Recherche client Square échouée — création bloquée pour éviter les doublons' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
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

    // 3. Upsert le profil Supabase avec le Square Customer ID
    if (squareCustomer && authUser) {
      const profileData: Record<string, unknown> = {
        id: authUser.id,
        square_customer_id: squareCustomer.id,
        updated_at: new Date().toISOString(),
      };
      // N'écraser le prénom que s'il existe dans Square
      if (squareCustomer.given_name) {
        profileData.full_name = `${squareCustomer.given_name} ${squareCustomer.family_name ?? ''}`.trim();
      }
      if (squareCustomer.email_address) {
        profileData.email = squareCustomer.email_address;
      }
      await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });
    }

    // 4. Garantir que le customer a une gift card Square active (1 par client).
    //    Doctrine : Square source de vérité, 1 carte par customer, idempotent.
    //    Non bloquant si ça échoue — on veut pas bloquer le login pour ça.
    let giftCardId: string | null = null;
    if (squareCustomer && authUser) {
      try {
        const ensureRes = await fetch(`${supabaseUrl}/functions/v1/ensure-gift-card`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            squareCustomerId: squareCustomer.id,
            userId: authUser.id,
          }),
        });
        if (ensureRes.ok) {
          const ensureData = await ensureRes.json();
          giftCardId = ensureData.giftCardId ?? null;
        } else {
          console.warn('[fetch-customer] ensure-gift-card failed:', await ensureRes.text());
        }
      } catch (err) {
        console.warn('[fetch-customer] ensure-gift-card exception:', err);
      }
    }

    // 5. Retourner les données client
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
              birthday: squareCustomer.birthday ?? null,
              address: squareCustomer.address ?? null,
              createdAt: squareCustomer.created_at,
              giftCardId,
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
