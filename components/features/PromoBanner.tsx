/**
 * PromoBanner — Carrousel promotionnel avec défilement automatique
 * Affiche 3 bannières de promotion en boucle toutes les 5 secondes
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radii } from '@/constants/theme';

/** Données internes des bannières promotionnelles */
const BANNERS = [
  {
    id: '1',
    title: 'Première commande ?',
    subtitle: '-15% avec le code',
    cta: 'BIENVENUE',
    gradientColors: [colors.green, colors.greenDark] as [string, string],
  },
  {
    id: '2',
    title: 'Parrainez un ami',
    subtitle: 'Gagnez 200 pts de fidélité',
    cta: 'Inviter →',
    gradientColors: [colors.gold, '#B8943A'] as [string, string],
  },
  {
    id: '3',
    title: 'Nouveau',
    subtitle: 'Matcha Zen Latte Glacé',
    cta: 'Découvrir →',
    gradientColors: ['#3A5A40', '#2D4A34'] as [string, string],
  },
] as const;

const BANNER_HEIGHT = 120;
const AUTO_SCROLL_INTERVAL = 5000;

export default function PromoBanner() {
  const { width: screenWidth } = Dimensions.get('window');
  const bannerWidth = screenWidth - spacing.lg * 2;

  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dotOpacity = useRef(BANNERS.map(() => new Animated.Value(0))).current;

  /** Animation des points de pagination */
  const animateDots = useCallback(
    (index: number) => {
      dotOpacity.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: i === index ? 1 : 0.4,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      });
    },
    [dotOpacity],
  );

  /** Défilement automatique toutes les 5 secondes */
  useEffect(() => {
    animateDots(0);
    // Initialiser le premier dot
    dotOpacity[0].setValue(1);
    dotOpacity.slice(1).forEach((d) => d.setValue(0.4));

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % BANNERS.length;
        scrollRef.current?.scrollTo({ x: next * bannerWidth, animated: true });
        animateDots(next);
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(interval);
  }, [animateDots, bannerWidth, dotOpacity]);

  /** Gestion du scroll manuel */
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / bannerWidth);
      if (index !== activeIndex && index >= 0 && index < BANNERS.length) {
        setActiveIndex(index);
        animateDots(index);
      }
    },
    [activeIndex, animateDots, bannerWidth],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={bannerWidth}
        contentContainerStyle={{ gap: 0 }}
      >
        {BANNERS.map((banner) => (
          <LinearGradient
            key={banner.id}
            colors={banner.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.banner, { width: bannerWidth }]}
          >
            <Text style={styles.title}>{banner.title}</Text>
            <Text style={styles.subtitle}>{banner.subtitle}</Text>
            <Text style={styles.cta}>{banner.cta}</Text>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Points de pagination */}
      <View style={styles.pagination}>
        {BANNERS.map((banner, i) => (
          <Animated.View
            key={banner.id}
            style={[
              styles.dot,
              {
                opacity: dotOpacity[i],
                backgroundColor: i === activeIndex ? colors.surface : colors.surface,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
  },
  banner: {
    height: BANNER_HEIGHT,
    borderRadius: radii.card,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: spacing.sm,
  },
  cta: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
  },
});
