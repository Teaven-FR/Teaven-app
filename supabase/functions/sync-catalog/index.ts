// Edge Function — Synchroniser le catalogue Square → Supabase
// Gère : catégories, items, variations, modificateurs, images
// Déployée via : supabase functions deploy sync-catalog

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping des catégories Square vers Teaven (case-insensitive)
const CATEGORY_MAP: Record<string, string> = {
  'nourrir': 'nourrir',
  'savourer': 'savourer',
  'emporter': 'emporter',
  'pâtisseries': 'patisseries',
  'patisseries': 'patisseries',
};

interface SquareObject {
  id: string;
  type: string;
  is_deleted?: boolean;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

/** Fetch tous les objets Square paginés d'un type donné */
async function fetchAllSquareObjects(
  baseUrl: string,
  token: string,
  types: string,
): Promise<SquareObject[]> {
  const all: SquareObject[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${baseUrl}/v2/catalog/list`);
    url.searchParams.set('types', types);
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url.toString(), {
      headers: {
        'Square-Version': '2025-01-23',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (data.objects) all.push(...data.objects);
    cursor = data.cursor;
  } while (cursor);

  return all;
}

/** Résout le slug de catégorie depuis un nom Square (case-insensitive) */
function resolveCategory(name: string): string {
  return CATEGORY_MAP[name.toLowerCase().trim()] ?? name.toLowerCase().replace(/\s+/g, '-');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Méthode non autorisée' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    // 1. Fetch toutes les données Square en parallèle
    const [categories, items, images, modifierLists] = await Promise.all([
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken!, 'CATEGORY'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken!, 'ITEM'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken!, 'IMAGE'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken!, 'MODIFIER_LIST'),
    ]);

    // 2. Construire les lookup maps
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.id, cat.category_data?.name ?? 'unknown');
    }

    const imageMap = new Map<string, string>();
    for (const img of images) {
      if (img.image_data?.url) {
        imageMap.set(img.id, img.image_data.url);
      }
    }

    const modifierListMap = new Map<string, SquareObject>();
    for (const ml of modifierLists) {
      modifierListMap.set(ml.id, ml);
    }

    // 3. Init Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 4. Upsert catégories
    const categoryRows = categories
      .filter((c) => !c.is_deleted)
      .map((c, i) => {
        const name = c.category_data?.name ?? 'unknown';
        return {
          square_category_id: c.id,
          slug: resolveCategory(name),
          label: name,
          ordinal: i + 1,
        };
      });

    if (categoryRows.length > 0) {
      await supabase
        .from('categories')
        .upsert(categoryRows, { onConflict: 'square_category_id' });
    }

    // 5. Transformer et upsert les produits
    let syncedProducts = 0;

    for (const item of items) {
      if (item.is_deleted) continue;

      const itemData = item.item_data;
      if (!itemData) continue;

      const variations = itemData.variations ?? [];
      const firstVariation = variations[0];
      const firstPrice = firstVariation?.item_variation_data?.price_money?.amount ?? 0;

      // Résoudre l'image
      const imageIds = itemData.image_ids ?? [];
      const imageUrl = imageIds.length > 0 ? (imageMap.get(imageIds[0]) ?? '') : '';

      const categoryId = itemData.category_id;
      const categoryName = categoryId ? categoryMap.get(categoryId) : undefined;

      // Upsert le produit
      const { data: dbProduct, error: productError } = await supabase
        .from('products')
        .upsert(
          {
            square_id: item.id,
            name: itemData.name ?? 'Sans nom',
            description: itemData.description ?? '',
            price: firstPrice,
            category: categoryName ? resolveCategory(categoryName) : 'savourer',
            image: imageUrl,
            square_image_url: imageUrl,
            available: true,
            tags: [],
            rating: 4.5,
            kcal: 0,
            prep_time: 10,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'square_id' },
        )
        .select('id')
        .single();

      if (productError || !dbProduct) {
        console.error('Product upsert error:', productError);
        continue;
      }

      const productId = dbProduct.id;

      // 6. Upsert les variations (upsert au lieu de delete + insert)
      if (variations.length > 0) {
        const variationRows = variations.map((v: SquareObject, i: number) => ({
          product_id: productId,
          square_variation_id: v.id,
          name: v.item_variation_data?.name ?? 'Standard',
          price: v.item_variation_data?.price_money?.amount ?? 0,
          ordinal: i,
        }));

        await supabase
          .from('product_variations')
          .upsert(variationRows, { onConflict: 'square_variation_id' });
      }

      // 7. Upsert les modificateurs
      const modifierListInfo = itemData.modifier_list_info ?? [];

      for (const mlInfo of modifierListInfo) {
        const mlId = mlInfo.modifier_list_id;
        const ml = modifierListMap.get(mlId);
        if (!ml) continue;

        const mlData = ml.modifier_list_data;
        if (!mlData) continue;

        const selectionType = mlData.selection_type === 'SINGLE' ? 'single' : 'multiple';

        // Upsert le modifier_group
        const { data: dbGroup, error: groupError } = await supabase
          .from('modifier_groups')
          .upsert(
            {
              product_id: productId,
              square_modifier_list_id: mlId,
              label: mlData.name ?? 'Options',
              type: selectionType,
              ordinal: 0,
            },
            { onConflict: 'square_modifier_list_id' },
          )
          .select('id')
          .single();

        if (groupError || !dbGroup) {
          console.error('Modifier group upsert error:', groupError);
          continue;
        }

        // Upsert les options du modifier
        const modifiers = mlData.modifiers ?? [];
        const optionRows = modifiers.map((mod: SquareObject, i: number) => ({
          group_id: dbGroup.id,
          square_modifier_id: mod.id,
          label: mod.modifier_data?.name ?? 'Option',
          price: mod.modifier_data?.price_money?.amount ?? 0,
          ordinal: i,
        }));

        if (optionRows.length > 0) {
          await supabase
            .from('modifier_options')
            .upsert(optionRows, { onConflict: 'square_modifier_id' });
        }
      }

      syncedProducts++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          products: syncedProducts,
          categories: categoryRows.length,
          images: images.length,
          modifierLists: modifierLists.length,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('sync-catalog error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
