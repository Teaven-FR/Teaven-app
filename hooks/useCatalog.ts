// Hook catalogue — données produits depuis Supabase avec variations et modificateurs
// Séquence : fetch DB → sync Square → re-fetch DB (si sync a mis à jour)
import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { syncCatalog } from '@/lib/square';
import { mockProducts, mockCategories } from '@/constants/mockData';
import type { Product, Category, ModifierGroup, ModifierOption, ProductVariation } from '@/lib/types';

/** Transforme les rows Supabase en Product[] */
function mapProducts(data: Record<string, unknown>[]): Product[] {
  return data.map((p) => {
    const rawVariations = (p.product_variations as Record<string, unknown>[]) ?? [];
    const variations: ProductVariation[] = rawVariations
      .sort((a, b) => ((a.ordinal as number) ?? 0) - ((b.ordinal as number) ?? 0))
      .map((v) => ({
        id: v.id as string,
        name: v.name as string,
        price: v.price as number,
        squareVariationId: v.square_variation_id as string,
      }));

    const rawGroups = (p.modifier_groups as Record<string, unknown>[]) ?? [];
    const modifiers: ModifierGroup[] = rawGroups
      .sort((a, b) => ((a.ordinal as number) ?? 0) - ((b.ordinal as number) ?? 0))
      .map((g) => {
        const rawOptions = (g.modifier_options as Record<string, unknown>[]) ?? [];
        const options: ModifierOption[] = rawOptions
          .sort((a, b) => ((a.ordinal as number) ?? 0) - ((b.ordinal as number) ?? 0))
          .map((o) => ({
            id: o.id as string,
            label: o.label as string,
            price: o.price as number,
            squareModifierId: o.square_modifier_id as string,
          }));

        return {
          id: g.id as string,
          label: g.label as string,
          type: (g.type as 'single' | 'multiple') ?? 'single',
          options,
        };
      });

    return {
      id: p.id as string,
      squareId: (p.square_id as string) ?? undefined,
      name: p.name as string,
      description: (p.description as string) ?? '',
      price: p.price as number,
      image: (p.square_image_url as string) || (p.image as string) || '',
      category: p.category as Product['category'],
      rating: Number(p.rating) || 4.5,
      kcal: (p.kcal as number) ?? 0,
      prepTime: (p.prep_time as number) ?? 10,
      tags: (p.tags as string[]) ?? [],
      location: (p.location as string) ?? 'Franconville',
      available: p.available as boolean,
      variations: variations.length > 0 ? variations : undefined,
      modifiers: modifiers.length > 0 ? modifiers : undefined,
    };
  });
}

/** Fetch produits depuis Supabase */
async function queryProducts() {
  return supabase
    .from('products')
    .select(`
      *,
      product_variations (*),
      modifier_groups (
        *,
        modifier_options (*)
      )
    `)
    .eq('available', true)
    .order('name');
}

const CATEGORY_LABELS: Record<string, string> = {
  'patisseries': 'Pâtisseries',
  'boissons': 'Boissons',
  'toasts': 'Toasts',
  'assiettes-bowls': 'Assiettes & Bowls',
  'salades': 'Salades',
};

/** Dérive les catégories depuis les produits actifs */
function deriveCategoriesFromProducts(products: Product[]): Category[] {
  const seen = new Set<string>();
  const cats: Category[] = [{ id: 'all', label: 'Tout' }];
  for (const p of products) {
    if (p.category && !seen.has(p.category)) {
      seen.add(p.category);
      cats.push({
        id: p.category,
        label: CATEGORY_LABELS[p.category] ?? (p.category.charAt(0).toUpperCase() + p.category.slice(1)),
      });
    }
  }
  return cats;
}

// Singleton : une seule sync partagée entre toutes les instances du hook
let syncPromise: Promise<{ data: unknown; error: string | null }> | null = null;

function sharedSyncCatalog() {
  if (!syncPromise) {
    syncPromise = syncCatalog().finally(() => {
      // Permettre un nouveau sync après 60s (éviter spam, mais autoriser pull-to-refresh)
      setTimeout(() => { syncPromise = null; }, 60_000);
    });
  }
  return syncPromise;
}

export function useCatalog() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [remoteProducts, setRemoteProducts] = useState<Product[] | null>(null);
  const [remoteCategories, setRemoteCategories] = useState<Category[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  /** Charge les produits depuis Supabase, puis synchronise Square en arrière-plan */
  const fetchProducts = useCallback(async (forceSync = false) => {
    setIsLoading(true);
    setSyncError(null);
    try {
      // 1. Fetch depuis Supabase (cache local) — affichage immédiat
      let productsRes = await queryProducts();
      let hasProducts = !productsRes.error && productsRes.data && productsRes.data.length > 0;

      // Si aucun produit available, chercher tous les produits (même unavailable)
      // Cela arrive quand sync-catalog a désactivé les produits sans pouvoir les réactiver
      if (!hasProducts) {
        productsRes = await supabase
          .from('products')
          .select(`*, product_variations (*), modifier_groups (*, modifier_options (*))`)
          .order('name');
        hasProducts = !productsRes.error && productsRes.data && productsRes.data.length > 0;
      }

      if (hasProducts) {
        const mapped = mapProducts(productsRes.data as Record<string, unknown>[]);
        setRemoteProducts(mapped);
        setRemoteCategories(deriveCategoriesFromProducts(mapped));
      }

      // 2. Déverrouiller l'UI immédiatement — pas besoin d'attendre Square
      setIsLoading(false);

      // 3. Sync Square → Supabase en arrière-plan
      // Ne PAS syncher au démarrage si on a déjà des produits (trop lent)
      // Sync uniquement si forceSync (pull-to-refresh) ou si la base est vide
      if (forceSync) syncPromise = null;
      const shouldSync = forceSync || !hasProducts;

      if (shouldSync) {
        sharedSyncCatalog()
          .then(async (syncResult) => {
            if (syncResult.error) {
              console.warn(`Sync catalogue Square échouée : ${syncResult.error}`);
              setSyncError(`Sync catalogue Square échouée : ${syncResult.error}`);
            } else {
              // Re-fetch silencieux après sync
              const freshProducts = await queryProducts();
              if (!freshProducts.error && freshProducts.data && freshProducts.data.length > 0) {
                const mapped = mapProducts(freshProducts.data as Record<string, unknown>[]);
                setRemoteProducts(mapped);
                setRemoteCategories(deriveCategoriesFromProducts(mapped));
              }
            }
          })
          .catch((err) => {
            console.warn(`Erreur sync catalogue : ${err instanceof Error ? err.message : String(err)}`);
          });
      }
    } catch (err) {
      const msg = `Erreur chargement catalogue : ${err instanceof Error ? err.message : String(err)}`;
      console.warn(msg);
      setSyncError(msg);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fallback sur les mock products si le catalogue Supabase est vide
  const allProducts = (remoteProducts && remoteProducts.length > 0) ? remoteProducts : mockProducts;
  const allCategories = (remoteCategories && remoteCategories.length > 0) ? remoteCategories : mockCategories;

  const products: Product[] = useMemo(() => {
    if (selectedCategory === 'all') return allProducts;
    return allProducts.filter((p) => p.category === selectedCategory);
  }, [selectedCategory, allProducts]);

  /** Force sync Square + re-fetch (pour pull-to-refresh) */
  const refetch = useCallback(() => fetchProducts(true), [fetchProducts]);

  return {
    products,
    allProducts,
    categories: allCategories,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    refetch,
    syncError,
    isUsingMockData: remoteProducts === null,
  };
}

/** Hook pour un produit unique par ID (avec variations & modificateurs) */
export function useProduct(id: string | undefined) {
  const { allProducts, isLoading, isUsingMockData, syncError } = useCatalog();

  const product = useMemo(() => {
    if (!id) return undefined;
    return allProducts.find((p) => p.id === id || p.squareId === id);
  }, [id, allProducts]);

  return { product, isLoading, isUsingMockData, syncError };
}
