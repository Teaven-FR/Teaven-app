// Carte article blog — scale 0.97 press feedback
import { useRef, useCallback } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import type { BlogArticle } from '@/lib/types';

interface ArticleCardProps {
  article: BlogArticle;
  onPress: () => void;
}

export function ArticleCard({ article, onPress }: ArticleCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const useNative = Platform.OS !== 'web';

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.97, damping: 15, stiffness: 300, useNativeDriver: useNative }).start();
  }, [scale, useNative]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 300, useNativeDriver: useNative }).start();
  }, [scale, useNative]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Image
          source={{ uri: article.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.content}>
          <Text style={styles.category}>{article.category.toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={2}>{article.title}</Text>
          <Text style={styles.meta}>{article.readTime} min de lecture</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: spacing.lg,
  },
  category: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  meta: {
    ...typography.bodySmall,
  },
});
