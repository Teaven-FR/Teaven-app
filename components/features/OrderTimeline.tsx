/**
 * OrderTimeline — Chronologie verticale du statut de commande
 * Affiche les 5 étapes avec point pulsant pour l'étape active
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, fonts, spacing, radii } from '@/constants/theme';

interface OrderTimelineProps {
  currentStatus: string;
  timestamps: Record<string, string>;
}

/** Étapes de la commande avec labels en français */
const STEPS = [
  { key: 'order_created', label: 'Commande reçue' },
  { key: 'accepted', label: 'Acceptée' },
  { key: 'preparing', label: 'En préparation' },
  { key: 'ready', label: 'Prête' },
  { key: 'picked_up', label: 'Récupérée' },
] as const;

export default function OrderTimeline({ currentStatus, timestamps }: OrderTimelineProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  /** Animation de pulsation pour l'étape active */
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  /** Détermine l'index de l'étape courante */
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isFuture = index > currentIndex;
        const isLast = index === STEPS.length - 1;
        const timestamp = timestamps[step.key];

        return (
          <View key={step.key} style={styles.stepRow}>
            {/* Colonne du point et de la ligne */}
            <View style={styles.dotColumn}>
              {/* Point */}
              {isActive ? (
                <Animated.View
                  style={[
                    styles.dot,
                    styles.dotActive,
                    { opacity: pulseAnim },
                  ]}
                />
              ) : isCompleted ? (
                <View style={[styles.dot, styles.dotCompleted]}>
                  <Check size={10} color={colors.surface} strokeWidth={2.5} />
                </View>
              ) : (
                <View style={[styles.dot, styles.dotFuture]} />
              )}

              {/* Ligne verticale (sauf pour le dernier) */}
              {!isLast && (
                <View
                  style={[
                    styles.line,
                    isCompleted ? styles.lineCompleted : styles.lineFuture,
                  ]}
                />
              )}
            </View>

            {/* Contenu texte */}
            <View style={styles.textColumn}>
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isFuture && styles.stepLabelFuture,
                ]}
              >
                {step.label}
              </Text>
              {timestamp ? (
                <Text style={styles.timestamp}>{timestamp}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT_SIZE = 22;

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotColumn: {
    width: DOT_SIZE,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotActive: {
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: colors.greenLight,
  },
  dotCompleted: {
    backgroundColor: colors.green,
  },
  dotFuture: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
  },
  line: {
    width: 2,
    height: 28,
  },
  lineCompleted: {
    backgroundColor: colors.green,
  },
  lineFuture: {
    backgroundColor: colors.border,
  },
  textColumn: {
    flex: 1,
    paddingBottom: spacing.xl,
  },
  stepLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  stepLabelActive: {
    color: colors.green,
  },
  stepLabelFuture: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  timestamp: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
