/**
 * ReferralCard — Carte de parrainage pour l'écran profil
 * Affiche le code de parrainage et le nombre d'amis parrainés
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, Users } from 'lucide-react-native';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

interface ReferralCardProps {
  code: string;
  referralCount: number;
  onShare: () => void;
}

export default function ReferralCard({ code, referralCount, onShare }: ReferralCardProps) {
  return (
    <LinearGradient
      colors={[colors.green, colors.greenDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Users size={16} color="rgba(255,255,255,0.8)" strokeWidth={1.3} />
          <Text style={styles.label}>PARRAINAGE</Text>
        </View>
      </View>

      {/* Code de parrainage */}
      <View style={styles.codeContainer}>
        <Text style={styles.codeText}>{code}</Text>
      </View>

      {/* Compteur et bouton */}
      <View style={styles.footer}>
        <Text style={styles.countText}>
          {referralCount} ami{referralCount > 1 ? 's' : ''} parrainé{referralCount > 1 ? 's' : ''}
        </Text>

        <Pressable style={styles.shareButton} onPress={onShare}>
          <Share2 size={14} color={colors.green} strokeWidth={1.3} />
          <Text style={styles.shareText}>Partager</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.loyalty,
    padding: spacing.lg,
    ...shadows.card,
  },
  header: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  codeContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  codeText: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  shareText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
});
