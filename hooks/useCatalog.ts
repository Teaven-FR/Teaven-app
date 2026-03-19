// Hook catalogue — données produits depuis Supabase (fallback mock)
import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { mockProducts, mockCategories } from '@/constants/mockData';
import type { Product } from '@/lib/types';

export function useCatalog() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [remoteProducts, setRemoteProducts] = useState<Product[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('available', true)
        .order('name');

      if (error || !data || data.length === 0) {
        // Fallback vers les données mock
        setRemoteProducts(null);
      } else {
        // Mapper les colonnes Supabase vers le type Product
        setRemoteProducts(
          data.map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
            description: (p.description as string) ?? '',
            price: p.price as number,
            image: (p.image as string) ?? '',
            category: p.category as Product['category'],
            rating: Number(p.rating) || 4.5,
            kcal: (p.kcal as number) ?? 0,
            prepTime: (p.prep_time as number) ?? 10,
            tags: (p.tags as string[]) ?? [],
            location: (p.location as string) ?? 'Franconville',
            available: p.available as boolean,
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

  const products: Product[] = useMemo(() => {
    if (selectedCategory === 'all') return allProducts;
    return allProducts.filter((p) => p.category === selectedCategory);
  }, [selectedCategory, allProducts]);

  return {
    products,
    categories: mockCategories,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    refetch: fetchProducts,
    isUsingMockData: remoteProducts === null,
  };
}
