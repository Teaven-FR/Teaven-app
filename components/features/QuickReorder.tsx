/**
 * QuickReorder — Carte flottante "Votre habituel ?"
 * Apparaît en bas de l'écran avec animation slide-up/down pour commander rapidement
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

interface QuickReorderProps {
  productName: string;
  /** Prix en centimes */
  price: number;
  onPress: () => void;
  visible: boolean;
}

export default function QuickReorder({ productName, price, onPress, visible }: QuickReorderProps) {
  const translateY = useRef(new Animated.Value(120)).current;

  /** Animation d'entrée (spring) ou de sortie selon la visibilité */
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 120,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [visible, translateY]);

  /** Formater le prix (centimes → euros) */
  const formattedPrice = (price / 100).toFixed(2).replace('.', ',') + ' €';

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable style={styles.card} onPress={onPress}>
        {/* Icône de recommande */}
        <View style={styles.iconContainer}>
          <RotateCcw size={18} color={colors.green} strokeWidth={1.3} />
        </View>

        {/* Informations produit */}
        <View style={styles.info}>
          <Text style={styles.label}>Votre habituel ?</Text>
          <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
        </View>

        {/* Prix */}
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formattedPrice}</Text>
          <Text style={styles.addText}>Ajouter</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 50,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productName: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 14,
    color: colors.green,
  },
  addText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.green,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
