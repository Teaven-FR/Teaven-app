// Page article complète — lecture immersive
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, User as UserIcon } from 'lucide-react-native';
import { mockArticles } from '@/constants/mockArticles';
import { colors, fonts, spacing } from '@/constants/theme';

const CATEGORY_LABELS: Record<string, string> = {
  'bien-etre': 'BIEN-ÊTRE',
  nutrition: 'NUTRITION',
  lifestyle: 'LIFESTYLE',
};

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const article = mockArticles.find((a) => a.id === id);

  if (!article) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Article introuvable</Text>
      </View>
    );
  }

  // Articles similaires (même catégorie, autre article)
  const similar = mockArticles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 2);

  // Découper le contenu en paragraphes
  const paragraphs = article.content.split('\n\n');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero image */}
      <View style={styles.heroWrap}>
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.heroImage}
          contentFit="cover"
          transition={400}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.5)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* Bouton retour */}
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { top: insets.top + 12 }]}
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={16} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>

      {/* Méta */}
      <View style={styles.meta}>
        <Text style={styles.categoryLabel}>
          {CATEGORY_LABELS[article.category] || article.category.toUpperCase()}
        </Text>
        <View style={styles.metaRow}>
          <Clock size={12} color={colors.textSecondary} strokeWidth={1.8} />
          <Text style={styles.metaText}>{article.readTime} min · {article.publishedAt}</Text>
        </View>
      </View>

      {/* Titre */}
      <Text style={styles.title}>{article.title}</Text>

      {/* Auteur */}
      <View style={styles.authorRow}>
        <UserIcon size={13} color={colors.textSecondary} strokeWidth={1.8} />
        <Text style={styles.authorText}>Par {article.author}</Text>
      </View>

      {/* Contenu */}
      <View style={styles.body}>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.paragraph}>{p}</Text>
        ))}
      </View>

      {/* Articles similaires */}
      {similar.length > 0 && (
        <View style={styles.similarSection}>
          <Text style={styles.similarTitle}>Articles similaires</Text>
          <View style={styles.similarCards}>
            {similar.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/article/${s.id}`)}
                style={({ pressed }) => [styles.similarCard, pressed && { opacity: 0.8 }]}
              >
                <Image
                  source={{ uri: s.imageUrl }}
                  style={styles.similarImage}
                  contentFit="cover"
                  transition={300}
                />
                <View style={styles.similarContent}>
                  <Text style={styles.similarCat}>
                    {CATEGORY_LABELS[s.category] || s.category.toUpperCase()}
                  </Text>
                  <Text style={styles.similarName} numberOfLines={2}>{s.title}</Text>
                  <Text style={styles.similarMeta}>{s.readTime} min</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  notFound: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginTop: 100,
  },

  // Hero
  heroWrap: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 250,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Méta
  meta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.green,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Titre + auteur
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    lineHeight: 32,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  authorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Body
  body: {
    paddingHorizontal: spacing.xl,
    gap: 24,
    marginBottom: spacing.xxxl,
  },
  paragraph: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 26,
    color: '#2A2A2A',
  },

  // Similaires
  similarSection: {
    paddingHorizontal: spacing.xl,
  },
  similarTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  similarCards: {
    gap: spacing.md,
  },
  similarCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  similarImage: {
    width: 100,
    height: 80,
  },
  similarContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  similarCat: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.green,
    marginBottom: 4,
  },
  similarName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  similarMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
