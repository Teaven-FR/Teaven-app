// Écran Blog Atmosphère — article à la une + articles récents + navigation
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { Pill } from '@/components/ui/Pill';
import { mockArticles, type BlogArticleFull } from '@/constants/mockArticles';
import { colors, fonts, spacing } from '@/constants/theme';

const CATEGORY_LABELS: Record<string, string> = {
  'bien-etre': 'Bien-être',
  nutrition: 'Nutrition',
  lifestyle: 'Lifestyle',
};

const blogCategories = [
  { id: 'all', label: 'Tout' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'bien-etre', label: 'Bien-être' },
  { id: 'lifestyle', label: 'Lifestyle' },
];

export default function BlogScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Article à la une (toujours featured)
  const featured = mockArticles.find((a) => a.featured) || mockArticles[0];

  // Articles récents filtrés (excluant le featured)
  const recentArticles =
    selectedCategory === 'all'
      ? mockArticles.filter((a) => a.id !== featured.id)
      : mockArticles.filter(
          (a) => a.category === selectedCategory && a.id !== featured.id,
        );

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
        <Pressable accessibilityLabel="Rechercher un article">
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
            key={cat.id}
            label={cat.label}
            active={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
          />
        ))}
      </ScrollView>

      {/* ──── Article à la une ──── */}
      <View style={styles.featuredWrapper}>
        <Pressable
          style={styles.featuredCard}
          onPress={() => router.push(`/article/${featured.id}`)}
          accessibilityLabel={`Article à la une : ${featured.title}`}
        >
          <Image
            source={{ uri: featured.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
            placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            style={styles.featuredOverlay}
          >
            <Text style={styles.featuredLabel}>
              À LA UNE · {(CATEGORY_LABELS[featured.category] || featured.category).toUpperCase()}
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
          <Pressable
            key={article.id}
            style={styles.articleCard}
            onPress={() => router.push(`/article/${article.id}`)}
            accessibilityLabel={article.title}
          >
            <Image
              source={{ uri: article.imageUrl }}
              style={styles.articleImage}
              contentFit="cover"
              transition={300}
              placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
            />
            <View style={styles.articleCatRow}>
              <Text style={styles.articleCategory}>
                {(CATEGORY_LABELS[article.category] || article.category).toUpperCase()}
              </Text>
              <Text style={styles.articleDate}>{article.publishedAt}</Text>
            </View>
            <Text style={styles.articleTitle} numberOfLines={2}>
              {article.title}
            </Text>
            <Text style={styles.articleExcerpt} numberOfLines={2}>
              {article.excerpt}
            </Text>
            <Text style={styles.readMore}>Lire la suite</Text>
          </Pressable>
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
