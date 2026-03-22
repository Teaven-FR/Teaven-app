// Écran Carte / Menu — grille 2 colonnes avec pills sticky + pull-to-refresh + bannière récompense
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { Search, Gift } from 'lucide-react-native';
import { Pill } from '@/components/ui/Pill';
import { ProductGridCard } from '@/components/ui/ProductGridCard';
import { SearchModal } from '@/components/ui/SearchModal';
import { useCatalog } from '@/hooks/useCatalog';
import { useUser } from '@/hooks/useUser';
import { colors, fonts, spacing, typography } from '@/constants/theme';
import type { Product } from '@/lib/types';

export default function CarteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, categories, selectedCategory, setSelectedCategory, refetch } = useCatalog();
  const { loyalty, rewards } = useUser();
  const [refreshing, setRefreshing] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  // Récompense la moins chère accessible (ou prochaine proche)
  const availableReward = rewards.find((r) => r.pointsCost <= loyalty.points)
    ?? rewards.slice().sort((a, b) => a.pointsCost - b.pointsCost)[0];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // En-tête de la grille (header + bannière récompense + pills sticky + compteur)
  const ListHeader = () => {
    const hasUnlockedReward = availableReward && availableReward.pointsCost <= loyalty.points;
    return (
    <>
      {/* Header : titre + sous-titre + loupe */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notre carte</Text>
          <Text style={styles.subtitle}>Fait maison, chaque jour.</Text>
        </View>
        <Pressable style={styles.searchButton} onPress={() => setSearchVisible(true)}>
          <Search size={17} color={colors.textSecondary} strokeWidth={1.6} />
        </Pressable>
      </View>

      {/* Bannière récompense */}
      {availableReward && (
        <Pressable
          style={[styles.rewardBanner, hasUnlockedReward && styles.rewardBannerActive]}
          onPress={() => router.push('/(tabs)/panier')}
          accessibilityRole="button"
          accessibilityLabel={hasUnlockedReward ? `Utiliser votre récompense : ${availableReward.name}` : `Plus que ${availableReward.pointsCost - loyalty.points} pts pour ${availableReward.name}`}
        >
          <View style={styles.rewardBannerLeft}>
            <Gift size={16} color={hasUnlockedReward ? colors.gold : colors.textSecondary} strokeWidth={1.8} />
            <Text style={[styles.rewardBannerText, hasUnlockedReward && styles.rewardBannerTextActive]}>
              {hasUnlockedReward
                ? `Récompense dispo : ${availableReward.name}`
                : `Plus que ${availableReward.pointsCost - loyalty.points} pts pour ${availableReward.name}`
              }
            </Text>
          </View>
          {hasUnlockedReward && (
            <Text style={styles.rewardBannerCta}>Utiliser →</Text>
          )}
        </Pressable>
      )}
    </>
  );
  };

  // Compteur produits
  const ProductCount = () => (
    <View style={styles.countContainer}>
      <Text style={styles.countText}>{products.length} PRODUITS</Text>
    </View>
  );

  const renderItem = ({ item, index }: { item: Product; index: number }) => (
    <View style={[styles.gridItem, index % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight]}>
      <ProductGridCard
        product={item}
        onPress={() => router.push(`/produit/${item.id}`)}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelect={(product) => {
          setSearchVisible(false);
          router.push(`/produit/${product.id}`);
        }}
      />
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.green}
            colors={[colors.green]}
          />
        }
        ListHeaderComponent={
          <>
            <ListHeader />

            {/* Pills sticky — dans une ScrollView horizontale */}
            <View style={styles.pillsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pills}
              >
                {categories.map((cat) => (
                  <Pill
                    key={cat.id}
                    label={cat.label}
                    active={selectedCategory === cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                  />
                ))}
              </ScrollView>
            </View>

            <ProductCount />
          </>
        }
        stickyHeaderIndices={[]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pills
  pillsWrapper: {
    marginHorizontal: -spacing.xl,
    marginBottom: spacing.sm,
  },
  pills: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },

  // Bannière récompense
  rewardBanner: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  rewardBannerActive: {
    backgroundColor: '#FFF8E7',
    borderColor: '#F0D080',
  },
  rewardBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rewardBannerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  rewardBannerTextActive: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  rewardBannerCta: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.gold,
  },

  // Compteur
  countContainer: {
    marginBottom: spacing.md,
  },
  countText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textMuted,
  },

  // Grille
  row: {
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  gridItemLeft: {},
  gridItemRight: {},
});
