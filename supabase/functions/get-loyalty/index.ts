// Edge Function — Récupérer les points de fidélité via Square Loyalty API
// Pour l'instant : retourne les points mock
// Plus tard : appelle Square Loyalty API
// Déployée via : supabase functions deploy get-loyalty

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Seuils de fidélité Teaven
const LOYALTY_THRESHOLDS = {
  Bronze: 0,
  Argent: 200,
  Or: 500,
  Platine: 1000,
};

function getLoyaltyLevel(points: number): string {
  if (points >= LOYALTY_THRESHOLDS.Platine) return 'Platine';
  if (points >= LOYALTY_THRESHOLDS.Or) return 'Or';
  if (points >= LOYALTY_THRESHOLDS.Argent) return 'Argent';
  return 'Bronze';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'customerId est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // TODO: Appeler Square Loyalty API
    // const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    // const loyaltyResponse = await fetch(...)

    // Pour l'instant : données mock
    const mockPoints = 1250;
    const level = getLoyaltyLevel(mockPoints);

    const rewards = [
      { id: '1', name: 'Boisson offerte', pointsCost: 500, icon: 'coffee' },
      { id: '2', name: 'Dessert offert', pointsCost: 750, icon: 'gift' },
      { id: '3', name: '-20% sur la carte', pointsCost: 1000, icon: 'percent' },
    ];

    return new Response(
      JSON.stringify({
        success: true,
        points: mockPoints,
        level,
        rewards,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('get-loyalty error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
