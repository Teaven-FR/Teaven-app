// Edge Function — Envoyer une notification push via Expo Notifications
// POST { user_id, title, body, data? }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const { user_id, title, body, data, type } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'user_id, title, body required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupérer le push token du client
    const { data: tokenRow } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!tokenRow?.expo_push_token) {
      return new Response(JSON.stringify({ sent: false, reason: 'no push token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Envoyer via Expo Push API
    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: tokenRow.expo_push_token,
        title,
        body,
        data: data ?? {},
        sound: 'default',
        badge: 1,
      }),
    });

    const pushResult = await pushRes.json();

    // Logger la notification
    await supabase.from('notification_log').insert({
      user_id,
      type: type ?? 'general',
      title,
      body,
      sent_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ sent: true, result: pushResult }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('push-send error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
