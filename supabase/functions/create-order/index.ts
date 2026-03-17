// Edge Function — Créer une commande Square
// Déployée séparément via : supabase functions deploy create-order

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  // TODO: Implémenter la création de commande via Square Orders API
  const { items } = await req.json();

  return new Response(
    JSON.stringify({ message: 'create-order placeholder', items }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
