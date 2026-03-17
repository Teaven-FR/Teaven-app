// Écran Blog Atmosphère — articles bien-être
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArticleCard } from '@/components/features/ArticleCard';
import { colors, spacing, typography } from '@/constants/theme';
import type { BlogArticle } from '@/lib/types';

// Articles mock
const mockArticles: BlogArticle[] = [
  {
    id: '1',
    title: 'Les bienfaits du matcha sur la concentration',
    excerpt: 'Découvrez comment le matcha peut améliorer votre focus...',
    image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&h=400&fit=crop',
    category: 'Bien-être',
    readTime: 5,
    publishedAt: '2026-03-15',
  },
  {
    id: '2',
    title: 'Meal prep : organiser ses repas healthy',
    excerpt: 'Nos conseils pour préparer vos repas de la semaine...',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop',
    category: 'Nutrition',
    readTime: 7,
    publishedAt: '2026-03-10',
  },
  {
    id: '3',
    title: '5 rituels du matin pour démarrer en douceur',
    excerpt: 'Des habitudes simples pour des matins sereins...',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop',
    category: 'Lifestyle',
    readTime: 4,
    publishedAt: '2026-03-05',
  },
];

export default function BlogScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Atmosphère</Text>
      <Text style={styles.subtitle}>
        Inspirations bien-être, nutrition et lifestyle
      </Text>

      <View style={styles.articles}>
        {mockArticles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onPress={() => {
              // TODO: Naviguer vers le détail article
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 100,
  },
  title: {
    ...typography.h1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  articles: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
});
