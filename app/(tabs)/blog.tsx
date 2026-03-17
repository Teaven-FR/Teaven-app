// Écran Blog Atmosphère — article à la une + articles récents
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Search } from 'lucide-react-native';
import { Pill } from '@/components/ui/Pill';
import { colors, fonts, spacing } from '@/constants/theme';
import type { BlogArticle } from '@/lib/types';

// ── Données mock ──
const mockArticles: (BlogArticle & { author: string })[] = [
  {
    id: '1',
    title: 'Les bienfaits du matcha sur la concentration',
    excerpt:
      'Découvrez comment le matcha peut améliorer votre focus et votre énergie au quotidien grâce à sa teneur unique en L-théanine.',
    image:
      'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&h=400&fit=crop',
    category: 'Bien-être',
    readTime: 5,
    publishedAt: '15 mars 2026',
    author: 'Éléonore V.',
  },
  {
    id: '2',
    title: 'Meal prep : organiser ses repas healthy pour la semaine',
    excerpt:
      'Nos conseils pour préparer vos repas de la semaine en toute sérénité et gagner du temps chaque jour.',
    image:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop',
    category: 'Nutrition',
    readTime: 7,
    publishedAt: '10 mars 2026',
    author: 'Sophie M.',
  },
  {
    id: '3',
    title: '5 rituels du matin pour démarrer en douceur',
    excerpt:
      'Des habitudes simples pour des matins sereins qui transforment votre journée entière.',
    image:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop',
    category: 'Lifestyle',
    readTime: 4,
    publishedAt: '5 mars 2026',
    author: 'Camille D.',
  },
  {
    id: '4',
    title: 'Le guide complet des super-aliments',
    excerpt:
      'Quels sont les vrais super-aliments et comment les intégrer facilement dans votre alimentation quotidienne.',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
    category: 'Nutrition',
    readTime: 8,
    publishedAt: '1 mars 2026',
    author: 'Hugo L.',
  },
];

const blogCategories = ['Tout', 'Nutrition', 'Bien-être', 'Lifestyle'];

export default function BlogScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('Tout');

  const featured = mockArticles[0];
  const recentArticles =
    selectedCategory === 'Tout'
      ? mockArticles.slice(1)
      : mockArticles
          .slice(1)
          .filter((a) => a.category === selectedCategory);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Atmosphère</Text>
          <Text style={styles.subtitle}>Prenez soin de vous</Text>
        </View>
        <Pressable>
          <Search size={20} color={colors.textSecondary} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* ──── Pills ──── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
      >
        {blogCategories.map((cat) => (
          <Pill
            key={cat}
            label={cat}
            active={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
          />
        ))}
      </ScrollView>

      {/* ──── Article à la une ──── */}
      <View style={styles.featuredWrapper}>
        <Pressable style={styles.featuredCard}>
          <Image
            source={{ uri: featured.image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.featuredOverlay}
          >
            <Text style={styles.featuredLabel}>
              À LA UNE · {featured.category.toUpperCase()}
            </Text>
            <Text style={styles.featuredTitle}>{featured.title}</Text>
            <Text style={styles.featuredMeta}>
              Par {featured.author} · {featured.readTime} min de lecture
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ──── Label articles récents ──── */}
      <Text style={styles.recentLabel}>ARTICLES RÉCENTS</Text>

      {/* ──── Cards articles ──── */}
      <View style={styles.articles}>
        {recentArticles.map((article) => (
          <View key={article.id} style={styles.articleCard}>
            <Image
              source={{ uri: article.image }}
              style={styles.articleImage}
              contentFit="cover"
              transition={300}
            />
            <View style={styles.articleCatRow}>
              <Text style={styles.articleCategory}>
                {article.category.toUpperCase()}
              </Text>
              <Text style={styles.articleDate}>{article.publishedAt}</Text>
            </View>
            <Text style={styles.articleTitle} numberOfLines={2}>
              {article.title}
            </Text>
            <Text style={styles.articleExcerpt} numberOfLines={2}>
              {article.excerpt}
            </Text>
            <Pressable>
              <Text style={styles.readMore}>Lire la suite</Text>
            </Pressable>
          </View>
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
  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Pills
  pills: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },

  // Featured
  featuredWrapper: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  featuredCard: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  featuredLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: spacing.xs,
  },
  featuredTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  featuredMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
  },

  // Recent label
  recentLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.green,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },

  // Article cards
  articles: {
    paddingHorizontal: spacing.xl,
    gap: 28,
  },
  articleCard: {},
  articleImage: {
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  articleCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  articleCategory: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.green,
  },
  articleDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  articleTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  articleExcerpt: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: '#737373',
    marginBottom: spacing.sm,
  },
  readMore: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
    textDecorationLine: 'underline',
  },
});
