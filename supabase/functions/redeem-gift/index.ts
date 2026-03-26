// ✅ CHANTIER 9 — Edge Function : utiliser un code cadeau
// Vérifie le code, transfère le solde vers le wallet du destinataire

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST requis' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { code } = body as { code: string };

    if (!code || code.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Code invalide' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Chercher le code cadeau
    const { data: gift, error: findError } = await supabase
      .from('wallet_gifts')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (findError || !gift) {
      return new Response(JSON.stringify({ error: 'Code cadeau introuvable' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (gift.status === 'claimed') {
      return new Response(JSON.stringify({ error: 'Ce code a déjà été utilisé' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (gift.status === 'expired') {
      return new Response(JSON.stringify({ error: 'Ce code a expiré' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Créditer le wallet du destinataire
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', authUser.id)
      .single();

    const currentBalance = profile?.wallet_balance ?? 0;
    const newBalance = currentBalance + gift.amount;

    await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    // 3. Marquer le gift comme utilisé
    await supabase
      .from('wallet_gifts')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        claimed_by: authUser.id,
      })
      .eq('id', gift.id);

    // 4. Chercher le nom de l'expéditeur
    let senderName = 'Quelqu\'un';
    if (gift.sender_id) {
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', gift.sender_id)
        .single();
      if (senderProfile?.full_name) senderName = senderProfile.full_name;
    }

    return new Response(JSON.stringify({
      success: true,
      amount: gift.amount,
      newBalance,
      senderName,
      momentName: gift.moment_name,
      message: gift.message,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('redeem-gift error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
