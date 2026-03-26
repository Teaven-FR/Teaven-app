// Edge Function — Récupérer les horaires d'ouverture depuis Square Location
// GET → retourne les business_hours du jour

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const squareBaseUrl = (Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox') === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';

const DAYS_MAP: Record<number, string> = {
  0: 'SUN', 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI', 6: 'SAT',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const locationId = Deno.env.get('SQUARE_LOCATION_ID');
    const accessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');

    if (!locationId || !accessToken) {
      return new Response(JSON.stringify({ error: 'Square credentials missing', fallback: true, open: 9, close: 20 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`${squareBaseUrl}/v2/locations/${locationId}`, {
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    const location = data.location;

    if (!location) {
      return new Response(JSON.stringify({ error: 'Location not found', fallback: true, open: 9, close: 20 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const periods = location.business_hours?.periods ?? [];
    const today = DAYS_MAP[new Date().getDay()];

    // Trouver les périodes du jour
    const todayPeriods = periods.filter((p: { day_of_week: string }) => p.day_of_week === today);

    // Extraire l'adresse
    const addr = location.address ?? {};
    const address = {
      line1: addr.address_line_1 ?? '',
      line2: addr.address_line_2 ?? '',
      city: addr.locality ?? '',
      postalCode: addr.postal_code ?? '',
      country: addr.country ?? 'FR',
    };
    const addressFormatted = [addr.address_line_1, `${addr.postal_code ?? ''} ${addr.locality ?? ''}`]
      .filter(Boolean).join(', ');

    if (todayPeriods.length === 0) {
      // Fermé aujourd'hui
      return new Response(JSON.stringify({
        closed: true,
        open: 0,
        close: 0,
        periods: [],
        location_name: location.name,
        address,
        addressFormatted,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extraire les heures d'ouverture/fermeture (format HH:MM)
    const allOpen = todayPeriods.map((p: { start_local_time: string }) => {
      const [h, m] = (p.start_local_time ?? '09:00').split(':').map(Number);
      return h * 60 + (m ?? 0);
    });
    const allClose = todayPeriods.map((p: { end_local_time: string }) => {
      const [h, m] = (p.end_local_time ?? '20:00').split(':').map(Number);
      return h * 60 + (m ?? 0);
    });

    const openMinutes = Math.min(...allOpen);
    const closeMinutes = Math.max(...allClose);

    return new Response(JSON.stringify({
      closed: false,
      open: Math.floor(openMinutes / 60),
      openMinute: openMinutes % 60,
      close: Math.floor(closeMinutes / 60),
      closeMinute: closeMinutes % 60,
      periods: todayPeriods,
      location_name: location.name,
      address,
      addressFormatted,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('get-business-hours error:', err);
    return new Response(JSON.stringify({ error: String(err), fallback: true, open: 9, close: 20 }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
