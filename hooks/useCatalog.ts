// Hook catalogue — données produits (mock pour l'instant)
import { useState, useMemo } from 'react';
import { mockProducts, mockCategories } from '@/constants/mockData';
import type { Product } from '@/lib/types';

export function useCatalog() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const products: Product[] = useMemo(() => {
    if (selectedCategory === 'all') return mockProducts;
    return mockProducts.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  return {
    products,
    categories: mockCategories,
    selectedCategory,
    setSelectedCategory,
    isLoading: false,
  };
}
