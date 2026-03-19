// Edge Function — Synchroniser le catalogue Square → Supabase
// Déployée séparément via : supabase functions deploy sync-catalog

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping des catégories Square vers Teaven
const CATEGORY_MAP: Record<string, string> = {
  'Nourrir': 'nourrir',
  'Savourer': 'savourer',
  'Emporter': 'emporter',
  'Pâtisseries': 'patisseries',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    // 1. Récupérer les catégories Square
    const catResponse = await fetch(`${squareBaseUrl}/v2/catalog/list?types=CATEGORY`, {
      headers: {
        'Square-Version': '2024-01-18',
        'Authorization': `Bearer ${squareAccessToken}`,
      },
    });
    const catData = await catResponse.json();
    const categories = new Map<string, string>();
    for (const obj of catData.objects ?? []) {
      categories.set(obj.id, obj.category_data?.name ?? 'unknown');
    }

    // 2. Récupérer tous les items du catalogue Square
    let cursor: string | undefined;
    const allItems: Array<Record<string, unknown>> = [];

    do {
      const url = new URL(`${squareBaseUrl}/v2/catalog/list`);
      url.searchParams.set('types', 'ITEM');
      if (cursor) url.searchParams.set('cursor', cursor);

      const response = await fetch(url.toString(), {
        headers: {
          'Square-Version': '2024-01-18',
          'Authorization': `Bearer ${squareAccessToken}`,
        },
      });

      const data = await response.json();
      if (data.objects) {
        allItems.push(...data.objects);
      }
      cursor = data.cursor;
    } while (cursor);

    // 3. Transformer en format Teaven
    const products = allItems.map((item: Record<string, unknown>) => {
      const itemData = item.item_data as Record<string, unknown> | undefined;
      const variations = (itemData?.variations as Array<Record<string, unknown>>) ?? [];
      const firstVariation = variations[0];
      const priceMoney = (firstVariation?.item_variation_data as Record<string, unknown>)?.price_money as Record<string, unknown> | undefined;

      const categoryId = itemData?.category_id as string | undefined;
      const categoryName = categoryId ? categories.get(categoryId) : undefined;

      return {
        square_id: item.id as string,
        name: itemData?.name as string ?? 'Sans nom',
        description: itemData?.description as string ?? '',
        price: (priceMoney?.amount as number) ?? 0,
        category: categoryName ? (CATEGORY_MAP[categoryName] ?? 'savourer') : 'savourer',
        image: (itemData?.image_url as string) ?? '',
        available: !item.is_deleted,
        tags: [],
        rating: 4.5,
        kcal: 0,
        prep_time: 10,
        updated_at: new Date().toISOString(),
      };
    });

    // 4. Upsert dans Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'square_id' });

    if (error) {
      console.error('Supabase upsert error:', error);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la sync', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: products.length,
        categories: Object.fromEntries(categories),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('sync-catalog error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
