/**
 * StreakCard — Carte de progression streak ou défi
 * Affiche l'avancement d'un défi avec barre de progression animée
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle, Coffee, Flame, Trophy } from 'lucide-react-native';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

interface StreakCardProps {
  type: 'streak' | 'challenge';
  title: string;
  description: string;
  progress: number;
  current: number;
  target: number;
  reward: string;
  icon: string;
  completed: boolean;
}

/** Correspondance nom d'icône → composant Lucide */
const ICON_MAP: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  flame: Flame,
  coffee: Coffee,
  trophy: Trophy,
};

const CARD_WIDTH = 260;

export default function StreakCard({
  type,
  title,
  description,
  progress,
  current,
  target,
  reward,
  icon,
  completed,
}: StreakCardProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  /** Animation de remplissage de la barre de progression */
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(progress, 1),
      duration: 800,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress, progressAnim]);

  const IconComponent = ICON_MAP[icon] || Flame;
  const iconColor = completed ? colors.surface : colors.green;

  return (
    <View
      style={[
        styles.card,
        completed && styles.cardCompleted,
      ]}
    >
      {/* Overlay de complétion */}
      {completed && (
        <View style={styles.completedOverlay}>
          <CheckCircle size={32} color={colors.surface} strokeWidth={1.3} />
        </View>
      )}

      {/* En-tête avec icône et type */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, completed && styles.iconContainerCompleted]}>
          <IconComponent size={20} color={iconColor} strokeWidth={1.3} />
        </View>
        <Text style={styles.typeLabel}>
          {type === 'streak' ? 'STREAK' : 'DÉFI'}
        </Text>
      </View>

      {/* Titre et description */}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.description} numberOfLines={2}>{description}</Text>

      {/* Barre de progression */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
            completed && styles.progressBarCompleted,
          ]}
        />
      </View>

      {/* Compteur */}
      <View style={styles.footer}>
        <Text style={styles.counter}>
          {current}/{target}
        </Text>
        <Text style={styles.reward}>🎁 {reward}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.lg,
    marginRight: spacing.md,
    ...shadows.card,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardCompleted: {
    borderColor: colors.green,
  },
  completedOverlay: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerCompleted: {
    backgroundColor: colors.green,
  },
  typeLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  progressBarCompleted: {
    backgroundColor: colors.greenDark,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.text,
  },
  reward: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.gold,
  },
});
