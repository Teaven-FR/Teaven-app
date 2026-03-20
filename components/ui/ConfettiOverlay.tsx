/**
 * ConfettiOverlay — Effet de confettis animé
 * 20 particules colorées tombant avec rotation, palette Teaven
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

interface ConfettiOverlayProps {
  visible: boolean;
  onComplete?: () => void;
}

/** Couleurs Teaven pour les confettis */
const CONFETTI_COLORS = [
  '#75967F', // vert principal
  '#4A6B50', // vert foncé
  '#C4A962', // or
  '#E8F0EA', // vert clair
  '#B8943A', // or foncé
  '#738478', // vert secondaire
  '#E8A849', // orange
  '#8B7EC8', // violet
];

const PARTICLE_COUNT = 20;
const DURATION = 2000;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Génère les données aléatoires d'une particule */
function createParticle() {
  return {
    x: Math.random() * SCREEN_WIDTH,
    size: 6 + Math.random() * 8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    isCircle: Math.random() > 0.5,
    delay: Math.random() * 400,
    rotateEnd: Math.floor(Math.random() * 4 + 2) * 360,
    horizontalDrift: (Math.random() - 0.5) * 80,
  };
}

export default function ConfettiOverlay({ visible, onComplete }: ConfettiOverlayProps) {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      data: createParticle(),
      translateY: new Animated.Value(-50),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
      translateX: new Animated.Value(0),
    })),
  ).current;

  /** Lancer l'animation de tous les confettis */
  const startAnimation = useCallback(() => {
    const animations = particles.map((p) => {
      // Réinitialiser les valeurs
      p.translateY.setValue(-50);
      p.opacity.setValue(1);
      p.rotate.setValue(0);
      p.translateX.setValue(0);

      // Régénérer les données aléatoires
      p.data = createParticle();

      return Animated.sequence([
        Animated.delay(p.data.delay),
        Animated.parallel([
          // Chute verticale
          Animated.timing(p.translateY, {
            toValue: SCREEN_HEIGHT + 50,
            duration: DURATION,
            useNativeDriver: Platform.OS !== 'web',
          }),
          // Dérive horizontale
          Animated.timing(p.translateX, {
            toValue: p.data.horizontalDrift,
            duration: DURATION,
            useNativeDriver: Platform.OS !== 'web',
          }),
          // Rotation
          Animated.timing(p.rotate, {
            toValue: p.data.rotateEnd,
            duration: DURATION,
            useNativeDriver: Platform.OS !== 'web',
          }),
          // Disparition progressive en fin d'animation
          Animated.sequence([
            Animated.delay(DURATION * 0.7),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: DURATION * 0.3,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      onComplete?.();
    });
  }, [particles, onComplete]);

  /** Déclencher l'animation quand visible passe à true */
  useEffect(() => {
    if (visible) {
      startAnimation();
    }
  }, [visible, startAnimation]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, index) => {
        const rotateInterpolation = p.rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: p.data.x,
                width: p.data.size,
                height: p.data.size,
                backgroundColor: p.data.color,
                borderRadius: p.data.isCircle ? p.data.size / 2 : 2,
                opacity: p.opacity,
                transform: [
                  { translateY: p.translateY },
                  { translateX: p.translateX },
                  { rotate: rotateInterpolation },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
