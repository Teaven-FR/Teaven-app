// Edge Function — Synchroniser le catalogue Square → Supabase
// Gère : catégories, items, variations, modificateurs, images
// Déployée via : supabase functions deploy sync-catalog

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ──────────────────────────────────────────────────────────────────────────
// Carte 2026 — catégories autorisées (noms EXACTS Square, lowercase)
// Seules ces 10 catégories sont affichées dans l'app.
// La clé est le nom Square normalisé (lowercase, trimmed, emojis stripped).
// ──────────────────────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'les formules midi': 'formules-midi',
  'les plats salés': 'plats-sales',
  'bowls et gaufres sucrés': 'bol-gaufres-sucres',
  'patisseries': 'patisserie',
  'pâtisseries': 'patisserie',
  'cafés': 'cafe',
  'cafés froids': 'cafe-froid',
  'carte du matcha': 'matcha',
  'chaï, ube et autres': 'autres',
  'thés et infusions chaudes': 'the-infusion-chaude',
  'eau, jus et infusions froides': 'eau-jus',
};

/**
 * Ordre d'affichage des catégories dans l'app (index = position).
 * Utilisé pour l'ordinal lors de l'upsert dans Supabase.
 */
const CATEGORY_ORDER: string[] = [
  'formules-midi',
  'plats-sales',
  'bol-gaufres-sucres',
  'patisserie',
  'cafe',
  'cafe-froid',
  'matcha',
  'autres',
  'the-infusion-chaude',
  'eau-jus',
];

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

/** Supprime les emojis et les espaces superflus d'un nom de catégorie */
function stripEmojis(str: string): string {
  return str
    .replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Résout le slug de catégorie depuis un nom Square (case-insensitive, emojis ignorés) */
function resolveCategory(name: string): string | null {
  const lower = name.toLowerCase().trim();
  // Essai exact d'abord
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  // Essai sans emojis
  const stripped = stripEmojis(lower);
  if (CATEGORY_MAP[stripped]) return CATEGORY_MAP[stripped];
  return null;
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

    // 1. Fetch toutes les données Square en parallèle (incluant MODIFIER séparés)
    const [categories, items, images, modifierLists, modifierObjects] = await Promise.all([
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'CATEGORY'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'ITEM'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'IMAGE'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'MODIFIER_LIST'),
      fetchAllSquareObjects(squareBaseUrl, squareAccessToken, 'MODIFIER'),
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

    // Index des MODIFIER objects séparés par leur modifier_list_id
    const modifiersByListId = new Map<string, SquareObject[]>();
    for (const mod of modifierObjects) {
      if (mod.is_deleted) continue;
      const listId = mod.modifier_data?.modifier_list_id;
      if (!listId) continue;
      if (!modifiersByListId.has(listId)) modifiersByListId.set(listId, []);
      modifiersByListId.get(listId)!.push(mod);
    }

    console.log(`[sync-catalog] ${modifierObjects.length} MODIFIER objects, ${modifiersByListId.size} lists avec modifiers séparés`);

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

    // 4. Upsert catégories (ordinal basé sur CATEGORY_ORDER pour l'ordre Carte 2026)
    const categoryRows = categories
      .filter((c) => !c.is_deleted && resolveCategory(c.category_data?.name ?? '') !== null)
      .map((c) => {
        const name = c.category_data?.name ?? 'unknown';
        const slug = resolveCategory(name)!;
        const ordinal = CATEGORY_ORDER.indexOf(slug);
        return {
          square_category_id: c.id,
          slug,
          label: name,
          ordinal: ordinal >= 0 ? ordinal + 1 : 99,
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

      // Résoudre la catégorie — tester TOUTES les catégories de l'item (nouveau format Square)
      const itemCategoryIds: string[] = [];
      if (itemData.category_id) itemCategoryIds.push(itemData.category_id);
      if (Array.isArray(itemData.categories)) {
        for (const cat of itemData.categories as { id: string }[]) {
          if (cat.id && !itemCategoryIds.includes(cat.id)) itemCategoryIds.push(cat.id);
        }
      }

      // Chercher le premier slug Carte 2026 parmi toutes les catégories de l'item
      let slug: string | null = null;
      for (const catId of itemCategoryIds) {
        const catName = categoryMap.get(catId);
        if (catName) {
          const resolved = resolveCategory(catName);
          if (resolved) { slug = resolved; break; }
        }
      }
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

      // 7. Sync modificateurs
      const modifierListInfo = itemData.modifier_list_info ?? [];

      // Supprimer les anciens groupes de ce produit et re-créer
      if (modifierListInfo.length > 0) {
        await supabase.from('modifier_groups').delete().eq('product_id', productId);
      }

      for (const mlInfo of modifierListInfo) {
        // Respecter enabled flag de Square — si désactivé, ne pas syncher
        if (mlInfo.enabled === false) continue;

        const mlId = mlInfo.modifier_list_id;
        const ml = modifierListMap.get(mlId);
        if (!ml || ml.is_deleted) continue;

        const mlData = ml.modifier_list_data;
        if (!mlData) continue;

        const selectionType = mlData.selection_type === 'SINGLE' ? 'single' : 'multiple';

        // Insérer le groupe (pas d'upsert — on a supprimé avant)
        const { data: dbGroup, error: groupError } = await supabase
          .from('modifier_groups')
          .insert({
            product_id: productId,
            label: mlData.name ?? 'Options',
            type: selectionType,
            ordinal: 0,
          })
          .select('id')
          .single();

        if (groupError || !dbGroup) {
          console.error('Modifier group insert error:', groupError?.message);
          continue;
        }

        // Insérer les options — d'abord les modifiers intégrés, sinon les MODIFIER objects séparés
        let modifiers = (mlData.modifiers ?? []).filter((m: SquareObject) => !m.is_deleted);
        if (modifiers.length === 0) {
          modifiers = (modifiersByListId.get(mlId) ?? []).filter((m: SquareObject) => !m.is_deleted);
        }
        const optionRows = modifiers.map((mod: SquareObject, i: number) => ({
          group_id: dbGroup.id,
          label: mod.modifier_data?.name ?? 'Option',
          price: mod.modifier_data?.price_money?.amount ?? 0,
          square_modifier_id: mod.id,
          ordinal: mod.modifier_data?.ordinal ?? i,
        }));

        if (optionRows.length > 0) {
          // Insert simple — les anciennes options sont supprimées via CASCADE du group
          const { error: optError } = await supabase
            .from('modifier_options')
            .insert(optionRows.map(({ square_modifier_id: _sid, ...rest }) => rest));
          if (optError) {
            console.error('Modifier options insert error:', optError.message);
            // Retry sans square_modifier_id si contrainte unique bloque
            const { error: retryError } = await supabase
              .from('modifier_options')
              .insert(optionRows.map(({ square_modifier_id, ...rest }) => ({
                ...rest,
                square_modifier_id: `${square_modifier_id}_${dbGroup.id}`,
              })));
            if (retryError) {
              console.error('Modifier options retry error:', retryError.message);
            }
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
