// Edge Function — Proxy Google Places API (New) — clé serveur uniquement
// GET ?action=autocomplete&input=... → suggestions d'adresses
// GET ?action=details&place_id=... → détails complets (adresse, lat/lng)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  // Accepter les params en query string (GET) ou dans le body (POST)
  let action = url.searchParams.get('action');
  let bodyParams: Record<string, string> = {};
  if (req.method === 'POST') {
    try { bodyParams = await req.json(); } catch { /* ignore */ }
    if (!action) action = bodyParams.action ?? null;
  }

  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'Google Places API key not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ─── Autocomplete (New API) ───────────────────────────────────────
    if (action === 'autocomplete') {
      const input = url.searchParams.get('input') ?? bodyParams.input;
      if (!input || input.length < 3) {
        return new Response(JSON.stringify({ predictions: [] }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
        },
        body: JSON.stringify({
          input,
          includedRegionCodes: ['fr'],
          includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
          languageCode: 'fr',
        }),
      });
      const data = await res.json();

      const predictions = (data.suggestions ?? [])
        .filter((s: { placePrediction?: unknown }) => s.placePrediction)
        .map((s: { placePrediction: { placeId: string; text: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }) => ({
          place_id: s.placePrediction.placeId,
          description: s.placePrediction.text.text,
          main_text: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text.text,
          secondary_text: s.placePrediction.structuredFormat?.secondaryText?.text ?? '',
        }));

      return new Response(JSON.stringify({ predictions }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Place Details (New API) ──────────────────────────────────────
    if (action === 'details') {
      const placeId = url.searchParams.get('place_id') ?? bodyParams.place_id;
      if (!placeId) {
        return new Response(JSON.stringify({ error: 'place_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'formattedAddress,addressComponents,location',
        },
      });
      const place = await res.json();

      if (!place.formattedAddress) {
        return new Response(JSON.stringify({ error: 'Place not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const components = place.addressComponents ?? [];
      const get = (type: string) =>
        components.find((c: { types: string[] }) => c.types.includes(type))?.longText ?? '';

      return new Response(JSON.stringify({
        formatted_address: place.formattedAddress,
        street: `${get('street_number')} ${get('route')}`.trim(),
        postal_code: get('postal_code'),
        city: get('locality') || get('sublocality') || get('administrative_area_level_2'),
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'action must be "autocomplete" or "details"' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('google-places error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
