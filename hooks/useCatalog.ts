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

/** Fetch catégories depuis Supabase */
async function queryCategories() {
  return supabase
    .from('categories')
    .select('*')
    .order('ordinal');
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

  /** Charge les produits depuis Supabase, puis synchronise Square si nécessaire */
  const fetchProducts = useCallback(async (forceSync = false) => {
    setIsLoading(true);
    setSyncError(null);
    try {
      // 1. Fetch depuis Supabase (données en cache)
      const [productsRes, categoriesRes] = await Promise.all([
        queryProducts(),
        queryCategories(),
      ]);

      const hasProducts = !productsRes.error && productsRes.data && productsRes.data.length > 0;
      const hasCategories = !categoriesRes.error && categoriesRes.data && categoriesRes.data.length > 0;

      if (hasProducts) {
        setRemoteProducts(mapProducts(productsRes.data as Record<string, unknown>[]));
      }

      if (hasCategories) {
        setRemoteCategories(
          categoriesRes.data!.map((c: Record<string, unknown>) => ({
            id: (c.slug as string) ?? (c.id as string),
            label: c.label as string,
          })),
        );
      }

      // 2. Sync Square → Supabase (singleton partagé, ou forcé par pull-to-refresh)
      const isFirstSync = syncPromise === null; // Première sync de la session
      if (forceSync) {
        syncPromise = null; // Forcer un nouveau sync
      }
      const shouldSync = forceSync || isFirstSync || !hasProducts;
      if (shouldSync) {
        const syncResult = await sharedSyncCatalog();

        if (syncResult.error) {
          const msg = `Sync catalogue Square échouée : ${syncResult.error}`;
          console.warn(msg);
          setSyncError(msg);
        } else {
          // 3. Re-fetch après sync pour récupérer les données fraîches
          const [freshProducts, freshCategories] = await Promise.all([
            queryProducts(),
            queryCategories(),
          ]);

          if (!freshProducts.error && freshProducts.data && freshProducts.data.length > 0) {
            setRemoteProducts(mapProducts(freshProducts.data as Record<string, unknown>[]));
          }

          if (!freshCategories.error && freshCategories.data && freshCategories.data.length > 0) {
            setRemoteCategories(
              freshCategories.data.map((c: Record<string, unknown>) => ({
                id: (c.slug as string) ?? (c.id as string),
                label: c.label as string,
              })),
            );
          }
        }
      }
    } catch (err) {
      // En cas d'erreur réseau, on garde les données existantes ou mock
      const msg = `Erreur chargement catalogue : ${err instanceof Error ? err.message : String(err)}`;
      console.warn(msg);
      setSyncError(msg);
      if (!remoteProducts) setRemoteProducts(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const allProducts = remoteProducts ?? mockProducts;
  const allCategories = remoteCategories ?? mockCategories;

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
