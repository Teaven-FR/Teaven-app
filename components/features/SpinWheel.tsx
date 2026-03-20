/**
 * SpinWheel — Jeu de la roue de la fortune
 * Modale avec roue à 6 segments, animation de rotation et résultat
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

interface SpinWheelProps {
  visible: boolean;
  onClose: () => void;
  onResult: (reward: string) => void;
}

/** Segments de la roue avec couleur associée */
const SEGMENTS = [
  { label: '50 pts', color: '#75967F' },
  { label: '100 pts', color: '#C4A962' },
  { label: 'Boisson offerte', color: '#4A6B50' },
  { label: '-10%', color: '#B8943A' },
  { label: 'Retentez', color: '#738478' },
  { label: '200 pts', color: '#3A5A40' },
] as const;

const SEGMENT_ANGLE = 360 / SEGMENTS.length;
const SPIN_DURATION = 3500;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = SCREEN_WIDTH * 0.7;

export default function SpinWheel({ visible, onClose, onResult }: SpinWheelProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const resultScale = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const lastAngle = useRef(0);

  /** Lancer la rotation de la roue */
  const spin = useCallback(() => {
    if (spinning) return;

    setSpinning(true);
    setResult(null);
    resultScale.setValue(0);

    // Angle aléatoire : 5 tours complets + position aléatoire
    const extraSpins = 5 * 360;
    const randomAngle = Math.floor(Math.random() * 360);
    const totalAngle = lastAngle.current + extraSpins + randomAngle;

    Animated.timing(rotateAnim, {
      toValue: totalAngle,
      duration: SPIN_DURATION,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      lastAngle.current = totalAngle;

      // Calculer le segment gagnant (l'aiguille est en haut)
      const finalAngle = totalAngle % 360;
      const segmentIndex = Math.floor(((360 - finalAngle + SEGMENT_ANGLE / 2) % 360) / SEGMENT_ANGLE);
      const winningSegment = SEGMENTS[segmentIndex % SEGMENTS.length];

      setResult(winningSegment.label);
      setSpinning(false);
      onResult(winningSegment.label);

      // Animation d'apparition du résultat
      Animated.spring(resultScale, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
  }, [spinning, rotateAnim, resultScale, onResult]);

  /** Fermer et réinitialiser */
  const handleClose = useCallback(() => {
    setResult(null);
    rotateAnim.setValue(0);
    resultScale.setValue(0);
    lastAngle.current = 0;
    onClose();
  }, [onClose, rotateAnim, resultScale]);

  /** Interpolation de la rotation */
  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Bouton fermer */}
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={colors.surface} strokeWidth={1.3} />
          </Pressable>

          <Text style={styles.title}>Tentez votre chance !</Text>

          {/* Indicateur (flèche en haut) */}
          <View style={styles.indicator} />

          {/* Roue */}
          <Animated.View
            style={[
              styles.wheel,
              { transform: [{ rotate: rotateInterpolation }] },
            ]}
          >
            {SEGMENTS.map((segment, index) => {
              const angle = index * SEGMENT_ANGLE;
              return (
                <View
                  key={segment.label}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: segment.color,
                      transform: [
                        { rotate: `${angle}deg` },
                        { translateY: -WHEEL_SIZE / 4 },
                      ],
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { transform: [{ rotate: `${SEGMENT_ANGLE / 2}deg` }] },
                    ]}
                    numberOfLines={2}
                  >
                    {segment.label}
                  </Text>
                </View>
              );
            })}
            {/* Centre de la roue */}
            <View style={styles.wheelCenter} />
          </Animated.View>

          {/* Résultat */}
          {result && (
            <Animated.View
              style={[styles.resultContainer, { transform: [{ scale: resultScale }] }]}
            >
              <Text style={styles.congratsText}>Félicitations !</Text>
              <Text style={styles.resultText}>{result}</Text>
            </Animated.View>
          )}

          {/* Bouton tourner */}
          {!result && (
            <Pressable
              style={[styles.spinButton, spinning && styles.spinButtonDisabled]}
              onPress={spin}
              disabled={spinning}
            >
              <Text style={styles.spinButtonText}>
                {spinning ? 'En cours...' : 'TOURNER'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.surface,
    marginBottom: spacing.xl,
  },
  indicator: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.gold,
    zIndex: 10,
    marginBottom: -6,
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: colors.greenDark,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.gold,
  },
  segment: {
    position: 'absolute',
    width: WHEEL_SIZE / 2.5,
    height: WHEEL_SIZE / 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    transformOrigin: 'center bottom',
  },
  segmentText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  wheelCenter: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  resultContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
  },
  congratsText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  resultText: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.surface,
  },
  spinButton: {
    marginTop: spacing.xxl,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
  },
  spinButtonDisabled: {
    opacity: 0.5,
  },
  spinButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});
