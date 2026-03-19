// Hook catalogue — données produits depuis Supabase avec variations et modificateurs
import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { mockProducts, mockCategories } from '@/constants/mockData';
import type { Product, Category, ModifierGroup, ModifierOption, ProductVariation } from '@/lib/types';

export function useCatalog() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [remoteProducts, setRemoteProducts] = useState<Product[] | null>(null);
  const [remoteCategories, setRemoteCategories] = useState<Category[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch produits avec variations et modificateurs en une seule requête
      const { data, error } = await supabase
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

      if (error || !data || data.length === 0) {
        setRemoteProducts(null);
      } else {
        setRemoteProducts(
          data.map((p: Record<string, unknown>) => {
            // Mapper les variations
            const rawVariations = (p.product_variations as Record<string, unknown>[]) ?? [];
            const variations: ProductVariation[] = rawVariations
              .sort((a, b) => ((a.ordinal as number) ?? 0) - ((b.ordinal as number) ?? 0))
              .map((v) => ({
                id: v.id as string,
                name: v.name as string,
                price: v.price as number,
                squareVariationId: v.square_variation_id as string,
              }));

            // Mapper les modificateurs
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
          }),
        );
      }

      // Fetch catégories dynamiques
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('ordinal');

      if (catData && catData.length > 0) {
        setRemoteCategories(
          catData.map((c: Record<string, unknown>) => ({
            id: (c.slug as string) ?? (c.id as string),
            label: c.label as string,
          })),
        );
      }
    } catch {
      setRemoteProducts(null);
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

  return {
    products,
    allProducts,
    categories: allCategories,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    refetch: fetchProducts,
    isUsingMockData: remoteProducts === null,
  };
}

/** Hook pour un produit unique par ID (avec variations & modificateurs) */
export function useProduct(id: string | undefined) {
  const { allProducts, isLoading, isUsingMockData } = useCatalog();

  const product = useMemo(() => {
    if (!id) return undefined;
    return allProducts.find((p) => p.id === id || p.squareId === id);
  }, [id, allProducts]);

  return { product, isLoading, isUsingMockData };
}
