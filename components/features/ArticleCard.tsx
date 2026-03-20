// Carte article blog — pour la section Atmosphère
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';
import type { BlogArticle } from '@/lib/types';

interface ArticleCardProps {
  article: BlogArticle;
  onPress: () => void;
}

export function ArticleCard({ article, onPress }: ArticleCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
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
  pressed: {
    opacity: 0.85,
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
