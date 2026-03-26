// Edge Function — Gérer le wallet Teaven via Square Gift Cards API
// Déployée via : supabase functions deploy manage-wallet

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SQUARE_BASE_URL = Deno.env.get('SQUARE_ENVIRONMENT') === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN') ?? '';
const SQUARE_VERSION = '2025-01-23';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type WalletAction = 'balance' | 'recharge' | 'pay';

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
    // Authentification — si pas connecté, retourner solde 0 (pas d'erreur)
    const authUser = await authenticateUser(req);
    if (!authUser) {
      return new Response(
        JSON.stringify({ success: true, balance: 0, giftCardId: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { action, amount, giftCardId } = body as {
      action: WalletAction;
      amount?: number;
      giftCardId?: string;
    };

    // L'userId vient du JWT, pas du body client (ownership enforced)
    const userId = authUser.id;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action est requis (balance | recharge | pay)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    switch (action) {
      case 'balance': {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, square_customer_id, square_gift_card_id')
          .eq('id', userId)
          .single();

        let balance = profile?.wallet_balance ?? 0;
        let giftCardIdFound = profile?.square_gift_card_id ?? null;

        if (SQUARE_ACCESS_TOKEN) {
          try {
            let giftCards: Record<string, unknown>[] = [];

            // 1. Chercher par customer_id si disponible
            if (profile?.square_customer_id) {
              const res = await fetch(
                `${SQUARE_BASE_URL}/v2/gift-cards?customer_id=${profile.square_customer_id}`,
                {
                  headers: {
                    'Square-Version': SQUARE_VERSION,
                    'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
                  },
                },
              );
              const data = await res.json();
              if (data.gift_cards) giftCards = data.gift_cards;
            }

            // 2. Si pas trouvé par customer_id, chercher par téléphone
            if (giftCards.length === 0 && authUser.phone) {
              let phone = authUser.phone;
              if (!phone.startsWith('+')) phone = '+' + phone;

              const searchRes = await fetch(`${SQUARE_BASE_URL}/v2/gift-cards/from-nonce`, {
                method: 'POST',
                headers: {
                  'Square-Version': SQUARE_VERSION,
                  'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nonce: phone }),
              });
              // from-nonce ne marche pas pour téléphone — utiliser list avec filtre
              // Square ne supporte pas le search par téléphone directement
              // On garde le fallback Supabase
              void searchRes;
            }

            // 3. Calculer le solde total de toutes les gift cards
            if (giftCards.length > 0) {
              const totalBalance = giftCards.reduce(
                (sum: number, gc) => {
                  const balanceMoney = gc.balance_money as Record<string, unknown> | undefined;
                  return sum + ((balanceMoney?.amount as number) ?? 0);
                },
                0,
              );
              balance = totalBalance;
              // Stocker le premier gift card ID pour les paiements wallet
              giftCardIdFound = (giftCards[0].id as string) ?? giftCardIdFound;

              // Sync dans Supabase
              await supabase
                .from('profiles')
                .update({
                  wallet_balance: balance,
                  square_gift_card_id: giftCardIdFound,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', userId);
            }
          } catch (err) {
            console.error('[manage-wallet] Erreur Square Gift Cards:', err);
          }
        }

        return new Response(
          JSON.stringify({ success: true, balance, giftCardId: giftCardIdFound }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      case 'recharge': {
        if (!amount || !Number.isInteger(amount) || amount <= 0 || amount > 50000) {
          return new Response(
            JSON.stringify({ error: 'amount doit être un entier positif en centimes (max 500€)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const transactionId = crypto.randomUUID();

        await supabase.rpc('increment_wallet', {
          user_id: userId,
          add_amount: amount,
        });

        await supabase.from('wallet_transactions').insert({
          user_id: userId,
          type: 'credit',
          amount,
          description: `Rechargement ${(amount / 100).toFixed(2)} €`,
        });

        return new Response(
          JSON.stringify({
            success: true,
            transactionId,
            amount,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      case 'pay': {
        if (!amount || !Number.isInteger(amount) || amount <= 0 || amount > 50000) {
          return new Response(
            JSON.stringify({ error: 'amount doit être un entier positif en centimes (max 500€)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // Vérifier le solde
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        if ((profile?.wallet_balance ?? 0) < amount) {
          return new Response(
            JSON.stringify({ error: 'Solde insuffisant' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const payTransactionId = crypto.randomUUID();

        await supabase.rpc('decrement_wallet', {
          user_id: userId,
          sub_amount: amount,
        });

        await supabase.from('wallet_transactions').insert({
          user_id: userId,
          type: 'debit',
          amount,
          description: `Paiement ${(amount / 100).toFixed(2)} €`,
        });

        return new Response(
          JSON.stringify({
            success: true,
            transactionId: payTransactionId,
            amount,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Action inconnue : ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
  } catch (err) {
    console.error('manage-wallet error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
