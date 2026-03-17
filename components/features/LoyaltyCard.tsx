// Carte fidélité premium — affichée sur le profil
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, shadows, spacing, typography } from '@/constants/theme';

interface LoyaltyCardProps {
  name: string;
  points: number;
  level: string;
}

export function LoyaltyCard({ name, points, level }: LoyaltyCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.brand}>TEAVEN</Text>
        <Text style={styles.level}>{level.toUpperCase()}</Text>
      </View>
      <View style={styles.pointsContainer}>
        <Text style={styles.points}>{points.toLocaleString('fr-FR')}</Text>
        <Text style={styles.pointsLabel}>POINTS</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.greenDark,
    borderRadius: radii.card,
    padding: spacing.xxl,
    ...shadows.loyalty,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 14,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.7)',
  },
  level: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: '#D4AF37',
  },
  pointsContainer: {
    marginBottom: spacing.lg,
  },
  points: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  pointsLabel: {
    ...typography.label,
    color: 'rgba(255,255,255,0.5)',
  },
  name: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});
