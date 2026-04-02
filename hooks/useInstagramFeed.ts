// Hook — Instagram feed depuis le cache Supabase (instagram_posts)
// Appelle l'Edge Function instagram-feed pour rafraîchir si nécessaire
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface InstagramPost {
  id: string;
  instagram_post_id: string;
  image_url: string;
  post_url: string;
  caption?: string | null;
  posted_at: string;
}

export function useInstagramFeed(limit = 6) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        // Lire depuis le cache Supabase (rapide)
        const { data } = await supabase
          .from('instagram_posts')
          .select('id, instagram_post_id, image_url, post_url, caption, posted_at')
          .order('posted_at', { ascending: false })
          .limit(limit);

        if (mounted && data && data.length > 0) {
          setPosts(data);
          setIsLoading(false);
          return;
        }

        // Aucun cache → appeler l'Edge Function pour populer
        const { data: fnData } = await supabase.functions.invoke('instagram-feed', {
          method: 'POST',
        });

        if (mounted && fnData?.success) {
          // Re-lire depuis le cache après refresh
          const { data: freshData } = await supabase
            .from('instagram_posts')
            .select('id, instagram_post_id, image_url, post_url, caption, posted_at')
            .order('posted_at', { ascending: false })
            .limit(limit);

          if (freshData) setPosts(freshData);
        }
      } catch {
        // Silently fail — l'encart ne s'affiche simplement pas
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [limit]);

  return { posts, isLoading };
}
