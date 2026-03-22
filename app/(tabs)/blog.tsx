// Écran Blog Atmosphère — article à la une + articles récents + pull-to-refresh + newsletter
import { useState, useCallback, Fragment } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Search, Mail, Gift } from 'lucide-react-native';
import { Pill } from '@/components/ui/Pill';
import { useBlog } from '@/hooks/useBlog';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
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
  const {
    articles,
    featuredArticle,
    selectedCategory,
    setSelectedCategory,
    refresh,
    isLoading,
  } = useBlog();

  const { user, isGuest, updateProfile, loyalty } = useUser();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const subscribeNewsletter = async () => {
    const email = newsletterEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    setNewsletterLoading(true);
    try {
      await supabase.from('newsletter_subscribers').upsert(
        { email, user_id: isGuest ? null : user.id ?? null, subscribed_at: new Date().toISOString() },
        { onConflict: 'email' },
      );
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      // +25 pts de fidélité si connecté
      if (!isGuest) {
        await updateProfile({ loyaltyPoints: loyalty.points + 25 });
        showToast('+25 pts crédités pour votre inscription !');
      } else {
        showToast('Inscription confirmée !');
      }
    } catch {
      showToast('Erreur, veuillez réessayer.');
    } finally {
      setNewsletterLoading(false);
    }
  };

  const filteredArticles = searchQuery.trim()
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.excerpt.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : articles;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refresh]);

  const featured = featuredArticle;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.green}
          colors={[colors.green]}
        />
      }
    >
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Atmosphère</Text>
          <Text style={styles.subtitle}>Prenez soin de vous</Text>
        </View>
        <Pressable
          onPress={() => setSearchVisible((v) => !v)}
          accessibilityLabel="Rechercher un article"
          accessibilityRole="button"
        >
          <Search size={20} color={searchVisible ? colors.green : colors.textSecondary} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* ──── Barre de recherche ──── */}
      {searchVisible && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un article..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="search"
          />
        </View>
      )}

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
      {featured && (
        <View style={styles.featuredWrapper}>
          <Pressable
            style={styles.featuredCard}
            onPress={() => router.push(`/article/${featured.id}`)}
            accessibilityLabel={`Article à la une : ${featured.title}`}
            accessibilityRole="button"
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
      )}

      {/* ──── Label articles récents ──── */}
      <Text style={styles.recentLabel}>ARTICLES RÉCENTS</Text>

      {/* ──── Cards articles avec newsletter intercalée après le 2e article ──── */}
      <View style={styles.articles}>
        {filteredArticles.map((article, index) => (
          <Fragment key={article.id}>
            <Pressable
              style={({ pressed }) => [styles.articleCard, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/article/${article.id}`)}
              accessibilityLabel={article.title}
              accessibilityRole="button"
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

            {/* Newsletter intercalée après le 2e article */}
            {index === 1 && !newsletterSubscribed && (
              <View style={styles.newsletterInline}>
                <View style={styles.newsletterInlineLeft}>
                  <View style={styles.newsletterInlineIcon}>
                    <Mail size={16} color={colors.green} strokeWidth={1.8} />
                  </View>
                  <View style={styles.newsletterInlineText}>
                    <Text style={styles.newsletterInlineTitle}>
                      Atmosphère dans votre boîte
                      {!isGuest && (
                        <Text style={styles.newsletterInlineBonus}> · +25 pts</Text>
                      )}
                    </Text>
                    <View style={styles.newsletterInlineInputRow}>
                      <TextInput
                        style={styles.newsletterInlineInput}
                        placeholder="votre@email.com"
                        placeholderTextColor={colors.textMuted}
                        value={newsletterEmail}
                        onChangeText={setNewsletterEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="send"
                        onSubmitEditing={subscribeNewsletter}
                      />
                      <Pressable
                        style={[
                          styles.newsletterInlineBtn,
                          (!newsletterEmail.includes('@') || newsletterLoading) && { opacity: 0.45 },
                        ]}
                        onPress={subscribeNewsletter}
                        disabled={!newsletterEmail.includes('@') || newsletterLoading}
                        accessibilityLabel="S'abonner à la newsletter Atmosphère"
                      >
                        <Text style={styles.newsletterInlineBtnText}>OK</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            )}
            {index === 1 && newsletterSubscribed && (
              <View style={[styles.newsletterInline, styles.newsletterInlineSuccess]}>
                <Mail size={14} color={colors.green} strokeWidth={1.8} />
                <Text style={styles.newsletterInlineSuccessText}>
                  Abonné·e à Atmosphère !
                </Text>
              </View>
            )}
          </Fragment>
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

  // Search
  searchWrap: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.green,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 10,
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

  // Newsletter inline (intercalée entre articles)
  newsletterInline: {
    backgroundColor: colors.greenLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B8D4BC',
    padding: 14,
  },
  newsletterInlineSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  newsletterInlineSuccessText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
  },
  newsletterInlineLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  newsletterInlineIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  newsletterInlineText: {
    flex: 1,
    gap: 8,
  },
  newsletterInlineTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  newsletterInlineBonus: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
  newsletterInlineInputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  newsletterInlineInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B8D4BC',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  newsletterInlineBtn: {
    height: 38,
    paddingHorizontal: 14,
    backgroundColor: colors.green,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newsletterInlineBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
  },
});
