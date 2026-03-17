// Edge Function — Synchroniser le catalogue Square
// Déployée séparément via : supabase functions deploy sync-catalog

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (_req) => {
  // TODO: Implémenter la sync via Square Catalog API
  return new Response(
    JSON.stringify({ message: 'sync-catalog placeholder' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
