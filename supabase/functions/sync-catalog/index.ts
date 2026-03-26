// Edge Function — Synchroniser le catalogue Square → Supabase
// Gère : catégories, items, variations, modificateurs, images
// Déployée via : supabase functions deploy sync-catalog

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping des catégories Square → slug Teaven (case-insensitive, match partiel)
// Toutes les catégories non mappées sont exclues (B2B, fidélisation, etc.)
const CATEGORY_MAP: Record<string, string> = {
  // Food principal
  '🍽 food teaven': 'nourrir',
  'food – toasts': 'nourrir',
  'food – assiettes & bowls': 'nourrir',
  'food – salades': 'nourrir',
  'food – petit-déjeuner': 'nourrir',
  'food - veloutés et soupes': 'nourrir',
  'food - cartes saisonnales': 'nourrir',
  'food - formules teaven': 'formules',
  // Pâtisseries
  '🍰 food – pâtisseries': 'patisseries',
  'les pâtisseries/desserts ✨🍰💚': 'patisseries',
  'mini cakes 🍰💚': 'patisseries',
  'cakes et muffins 🍰🧁💚': 'patisseries',
  'cookies 🍪✨💚': 'patisseries',
  'cake sans gluten 🍰💚✨': 'patisseries',
  'brioches 🥮✨💚': 'patisseries',
  'véganes 🍃🍰': 'patisseries',
  'cakes et cookies': 'patisseries',
  'brioches': 'patisseries',
  'véganes': 'patisseries',
  'sans gluten': 'patisseries',
  'pâtisseries maison ✨🍰': 'patisseries',
  'desserts ✨🍰💚': 'patisseries',
  'cakes/cookies/muffins ✨💚': 'patisseries',
  // Boissons
  'boissons ☕️🍵': 'boissons',
  'boissons – café': 'boissons',
  'boissons – matcha': 'boissons',
  'boissons – chaï': 'boissons',
  'boissons – thés': 'boissons',
  'boissons – infusions&rooibos': 'boissons',
  'boissons artisanales – thés glacés': 'boissons',
  'boissons – smootea': 'boissons',
  'boissons – jus bien-être': 'boissons',
  'boissons – eau': 'boissons',
  'boissons – signatures&lattés': 'boissons',
  'les boissons 🍹✨💚': 'boissons',
  'cafés ✨☕️': 'boissons',
  'cafés ✨☕️💚': 'boissons',
  'café chaud ✨☕️': 'boissons',
  'café froid ✨☕️🧊': 'boissons',
  'café froid ✨🧊 ☕️': 'boissons',
  'matcha chaud ✨🧊🍵': 'boissons',
  'matcha froid ✨🧊🍵': 'boissons',
  'matcha, chaï & signatures ✨🍵': 'boissons',
  'matcha, chaï & signatures': 'boissons',
  'signatures ✨🍵': 'boissons',
  'rooibos ✨❤️': 'boissons',
  'boissons fraîches ✨🧊': 'boissons',
  'boissons fraîches ✨🍹🧊': 'boissons',
  'smooteas ✨🥭': 'boissons',
  'infusions ✨🍃': 'boissons',
  'thés ✨🍃': 'boissons',
  'eaux ✨💧': 'boissons',
  'jus bien-être 🍃💫💚': 'boissons',
  // Formules
  'les formules midi ✨💚': 'formules',
  'les formules après-midi/soir ✨💚': 'formules',
  'les formules et les plats ✨🥪💚': 'formules',
  'formules ✨💚⭐': 'formules',
  'formules ✨💚': 'formules',
  'formules 🧡✨': 'formules',
  'formules': 'formules',
  'brunch&tea ✨💚': 'formules',
  'midi / brunch ✨🥪💚': 'formules',
  '⭐ rituels du matin (formules)': 'formules',
  'rituel du matin ✨☀️': 'formules',
  // Nourrir (plats salés)
  'bowls et assiettes 🍽️🥗💚': 'nourrir',
  'les salades ✨🥗': 'nourrir',
  'les toasts et triangles 🥪💚': 'nourrir',
  'les veloutés ✨🍲': 'nourrir',
  'les salades et veloutés 🥗🍜✨': 'nourrir',
  'toasts signature ✨💚': 'nourrir',
  'assiettes&bowls&salades ✨🥗💚': 'nourrir',
  'bowls et granola 💫☀️🥥': 'nourrir',
  'bowls ✨💚': 'nourrir',
  'salée ✨💚': 'nourrir',
  'petit-déjeuner ✨🥮': 'nourrir',
  'petit-déjeuner': 'nourrir',
  'pour les enfants ✨💚': 'nourrir',
  'toasts et plats hc 🥪✨': 'nourrir',
  // Saisonnières
  '✨💙❄️ l\'hivernal - la carte d\'hiver ❄️💙✨': 'nourrir',
  '💛☀️✨ l\'estival la carte d\'été 💛☀️✨': 'nourrir',
  'saint-valentin': 'nourrir',
  // Emporter (boutique thé/accessoires)
  '🫖 retail': 'emporter',
  'boutique teaven': 'emporter',
  'boutique - thés': 'emporter',
  'boutique - accessoires': 'emporter',
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
function resolveCategory(name: string): string | null {
  return CATEGORY_MAP[name.toLowerCase().trim()] ?? null;
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
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const debugMode = body.debug === true;

    const squareAccessToken = Deno.env.get('SQUARE_ACCESS_TOKEN');
    const squareEnvironment = Deno.env.get('SQUARE_ENVIRONMENT') ?? 'sandbox';
    const squareBaseUrl = squareEnvironment === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

    if (!squareAccessToken) {
      return new Response(
        JSON.stringify({ error: 'SQUARE_ACCESS_TOKEN manquant', success: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[sync-catalog] Env: ${squareEnvironment}, Base: ${squareBaseUrl}`);

    // 1. Fetch toutes les données Square en parallèle
    const [categories, items, images, modifierLists] = await Promise.all([
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'CATEGORY'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'ITEM'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'IMAGE'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'MODIFIER_LIST'),
    ]);

    console.log(`[sync-catalog] Fetched: ${categories.length} categories, ${items.length} items, ${images.length} images, ${modifierLists.length} modifierLists`);

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

    // Mode debug : retourner les données Square brutes sans sync
    if (debugMode) {
      const categoryNames = categories
        .filter((c) => !c.is_deleted)
        .map((c) => c.category_data?.name ?? 'unknown');
      const itemNames = items
        .filter((i) => !i.is_deleted)
        .slice(0, 20)
        .map((i) => ({
          name: i.item_data?.name ?? 'unknown',
          categoryId: i.item_data?.category_id ?? i.item_data?.categories?.[0]?.id ?? null,
        }));
      return new Response(
        JSON.stringify({
          debug: true,
          environment: squareEnvironment,
          categories: categoryNames,
          items: itemNames,
          counts: { categories: categories.length, items: items.length, images: images.length },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Init Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 4. Upsert catégories
    const categoryRows = categories
      .filter((c) => !c.is_deleted && resolveCategory(c.category_data?.name ?? '') !== null)
      .map((c, i) => {
        const name = c.category_data?.name ?? 'unknown';
        return {
          square_category_id: c.id,
          slug: resolveCategory(name)!,
          label: name,
          ordinal: i + 1,
        };
      });

    if (categoryRows.length > 0) {
      await supabase
        .from('categories')
        .upsert(categoryRows, { onConflict: 'square_category_id' });
    }

    // 5. Désactiver les produits UNIQUEMENT si Square a retourné des items
    // Sinon on garde l'état actuel (évite de tout casser si le token Square est invalide)
    if (items.length > 0) {
      await supabase.from('products').update({ available: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    } else {
      console.log('[sync-catalog] Aucun item Square reçu — on ne désactive pas les produits existants');
      // Réactiver tous les produits existants (ils avaient été désactivés par un sync précédent)
      await supabase.from('products').update({ available: true }).eq('available', false);
    }

    // 6. Transformer et upsert les produits
    let syncedProducts = 0;

    for (const item of items) {
      if (item.is_deleted) continue;

      const itemData = item.item_data;
      if (!itemData) continue;

      // Résoudre la catégorie (category_id ancien format, categories[] nouveau format Square)
      const categoryId = itemData.category_id
        ?? (itemData.categories as { id: string }[] | undefined)?.[0]?.id;
      const categoryName = categoryId ? categoryMap.get(categoryId) : undefined;

      // Filtrer : n'inclure que les catégories mappées (exclut B2B, fidélisation, etc.)
      const slug = categoryName ? resolveCategory(categoryName) : null;
      if (!slug) continue;

      const variations = itemData.variations ?? [];
      const firstVariation = variations[0];
      const firstPrice = firstVariation?.item_variation_data?.price_money?.amount ?? 0;

      // Résoudre l'image
      const imageIds = itemData.image_ids ?? [];
      const imageUrl = imageIds.length > 0 ? (imageMap.get(imageIds[0]) ?? '') : '';

      // Upsert le produit
      const { data: dbProduct, error: productError } = await supabase
        .from('products')
        .upsert(
          {
            square_id: item.id,
            name: itemData.name ?? 'Sans nom',
            description: itemData.description ?? '',
            price: firstPrice,
            category: slug!,
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

      // 7. Sync modificateurs — upsert sans delete pour préserver les données existantes
      // Ne supprimer que les groupes dont le modifier_list_id n'est plus présent dans Square
      const modifierListInfo = itemData.modifier_list_info ?? [];
      const activeModifierListIds = modifierListInfo.map((ml: { modifier_list_id: string }) => ml.modifier_list_id);

      if (activeModifierListIds.length === 0) {
        // Pas de modifiers dans Square pour cet item → conserver les données existantes
      } else {
        // Supprimer uniquement les groupes qui ne sont plus dans la liste Square
        await supabase
          .from('modifier_groups')
          .delete()
          .eq('product_id', productId)
          .not('square_modifier_list_id', 'in', `(${activeModifierListIds.map((id: string) => `"${id}"`).join(',')})`);
      }

      for (const mlInfo of modifierListInfo) {
        const mlId = mlInfo.modifier_list_id;
        const ml = modifierListMap.get(mlId);
        if (!ml) continue;

        const mlData = ml.modifier_list_data;
        if (!mlData) continue;

        const selectionType = mlData.selection_type === 'SINGLE' ? 'single' : 'multiple';

        // Upsert le modifier_group avec clé composite (product_id, square_modifier_list_id)
        // pour permettre à plusieurs produits de partager la même modifier list Square
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
            { onConflict: 'product_id,square_modifier_list_id' },
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
          const { error: optError } = await supabase
            .from('modifier_options')
            .upsert(optionRows, { onConflict: 'group_id,square_modifier_id' });
          if (optError) {
            console.error('Modifier options upsert error:', optError.message);
          }
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
        reactivatedExisting: items.length === 0,
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
