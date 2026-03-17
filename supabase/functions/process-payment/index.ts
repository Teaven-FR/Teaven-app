// Edge Function — Traiter un paiement Square
// Déployée séparément via : supabase functions deploy process-payment

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  // TODO: Implémenter le paiement via Square Payments API
  const body = await req.json();

  return new Response(
    JSON.stringify({ message: 'process-payment placeholder', ...body }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
