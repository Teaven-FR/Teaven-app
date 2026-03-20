// Edge Function — Gérer le wallet Teaven via Square Gift Cards API
// Pour l'instant : simule les opérations
// Plus tard : appelle Square Gift Cards API
// Déployée via : supabase functions deploy manage-wallet

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type WalletAction = 'balance' | 'recharge' | 'pay';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, amount, giftCardId, userId } = await req.json() as {
      action: WalletAction;
      amount?: number;
      giftCardId?: string;
      userId?: string;
    };

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

    // TODO: Appeler Square Gift Cards API
    // const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');

    switch (action) {
      case 'balance': {
        // Pour l'instant : retourne le solde depuis Supabase
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId est requis pour balance' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            balance: profile?.wallet_balance ?? 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      case 'recharge': {
        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'amount positif requis pour recharge' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // Simuler le rechargement
        const transactionId = crypto.randomUUID();

        // Mettre à jour le solde dans Supabase
        if (userId) {
          await supabase.rpc('increment_wallet', {
            user_id: userId,
            add_amount: amount,
          });

          // Logger la transaction
          await supabase.from('wallet_transactions').insert({
            user_id: userId,
            type: 'credit',
            amount,
            description: `Rechargement ${(amount / 100).toFixed(2)} €`,
          });
        }

        return new Response(
          JSON.stringify({
            success: true,
            transactionId,
            amount,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      case 'pay': {
        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'amount positif requis pour pay' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        // Simuler le paiement depuis le wallet
        const payTransactionId = crypto.randomUUID();

        if (userId) {
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
        }

        return new Response(
          JSON.stringify({
            success: true,
            transactionId: payTransactionId,
            amount,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
