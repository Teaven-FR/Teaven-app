// Edge Function — Webhook Square (notifications commandes)
// Déployée séparément via : supabase functions deploy square-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  // TODO: Implémenter la réception des webhooks Square
  const body = await req.json();

  return new Response(
    JSON.stringify({ received: true }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
