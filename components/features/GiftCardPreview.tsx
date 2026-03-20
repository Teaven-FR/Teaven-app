/**
 * GiftCardPreview — Aperçu visuel d'une carte cadeau digitale
 * Design premium avec dégradé vert et format carte de crédit (ratio ~1.6:1)
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift } from 'lucide-react-native';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

interface GiftCardPreviewProps {
  /** Montant en centimes */
  amount: number;
  message: string;
  recipientName?: string;
}

export default function GiftCardPreview({ amount, message, recipientName }: GiftCardPreviewProps) {
  /** Formater le montant (centimes → euros) */
  const formattedAmount = (amount / 100).toFixed(0) + ' €';

  return (
    <LinearGradient
      colors={[colors.green, colors.greenDark, '#2D4A34']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Motif décoratif en arrière-plan */}
      <View style={styles.decorCircle} />
      <View style={styles.decorCircle2} />

      {/* Branding */}
      <Text style={styles.branding}>TEAVEN</Text>

      {/* Sous-titre */}
      <Text style={styles.subtitle}>Carte cadeau digitale</Text>

      {/* Montant */}
      <Text style={styles.amount}>{formattedAmount}</Text>

      {/* Message personnel */}
      <Text style={styles.message} numberOfLines={2}>{message}</Text>

      {/* Destinataire (optionnel) */}
      <View style={styles.footer}>
        {recipientName ? (
          <View style={styles.recipientRow}>
            <Gift size={14} color="rgba(255,255,255,0.7)" strokeWidth={1.3} />
            <Text style={styles.recipientText}>Pour {recipientName}</Text>
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const CARD_WIDTH = 320;
const CARD_HEIGHT = CARD_WIDTH / 1.6;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.loyalty,
    padding: spacing.xl,
    justifyContent: 'space-between',
    overflow: 'hidden',
    alignSelf: 'center',
    ...shadows.loyalty,
  },
  decorCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  branding: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 5,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  amount: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 36,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recipientText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
