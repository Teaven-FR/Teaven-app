// Hook blog — articles avec filtrage par catégorie
import { useState, useMemo, useCallback } from 'react';
import { mockArticles } from '@/constants/mockArticles';
import type { BlogArticle } from '@/lib/types';

export function useBlog() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  // Pour l'instant : retourne les mockArticles
  // Plus tard : fetch depuis Supabase
  const allArticles: BlogArticle[] = useMemo(
    () => mockArticles.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      content: a.content,
      category: a.category,
      author: a.author,
      readTime: a.readTime,
      imageUrl: a.imageUrl,
      publishedAt: a.publishedAt,
      featured: a.featured,
    })),
    [],
  );

  // Article à la une
  const featuredArticle = useMemo(
    () => allArticles.find((a) => a.featured) ?? allArticles[0],
    [allArticles],
  );

  // Articles filtrés par catégorie (excluant le featured)
  const articles = useMemo(() => {
    const filtered = selectedCategory === 'all'
      ? allArticles.filter((a) => a.id !== featuredArticle?.id)
      : allArticles.filter(
          (a) => a.category === selectedCategory && a.id !== featuredArticle?.id,
        );
    return filtered;
  }, [selectedCategory, allArticles, featuredArticle]);

  // Chercher un article par ID
  const getArticleById = useCallback(
    (id: string) => allArticles.find((a) => a.id === id),
    [allArticles],
  );

  // Simuler un refresh
  const refresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  return {
    articles,
    allArticles,
    featuredArticle,
    selectedCategory,
    setSelectedCategory,
    getArticleById,
    isLoading,
    refresh,
  };
}
