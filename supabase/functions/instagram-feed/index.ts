// Edge Function — Récupérer et cacher les posts Instagram
// GET → retourne les 6 derniers posts depuis Supabase cache
// POST → refresh le cache depuis Instagram Graph API
// Variables requises : INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID

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

  // GET — lire le cache Supabase
  if (req.method === 'GET') {
    const { data: posts, error } = await supabase
      .from('instagram_posts')
      .select('*')
      .order('posted_at', { ascending: false })
      .limit(6);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ posts: posts ?? [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // POST — refresh depuis Instagram API
  if (req.method === 'POST') {
    const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');

    if (!accessToken) {
      return new Response(JSON.stringify({
        message: 'Instagram non configuré — ajoutez INSTAGRAM_ACCESS_TOKEN dans les secrets Supabase',
        stub: true,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_url,thumbnail_url,permalink,timestamp,media_type&access_token=${accessToken}&limit=12`,
    );
    const { data: igPosts } = await res.json();

    if (!igPosts?.length) {
      return new Response(JSON.stringify({ posts: [], message: 'Aucun post trouvé' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rows = igPosts.map((p: { id: string; media_url: string; thumbnail_url?: string; permalink: string; caption?: string; timestamp: string; media_type?: string }) => ({
      instagram_post_id: p.id,
      image_url: p.media_type === 'VIDEO' ? (p.thumbnail_url ?? p.media_url) : p.media_url,
      post_url: p.permalink,
      caption: p.caption ?? null,
      posted_at: p.timestamp,
      cached_at: new Date().toISOString(),
    }));

    await supabase.from('instagram_posts')
      .upsert(rows, { onConflict: 'instagram_post_id' });

    return new Response(JSON.stringify({ success: true, cached: rows.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
});
