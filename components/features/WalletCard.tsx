// Carte porte-monnaie — affiche le solde carte cadeau
import { View, Text, StyleSheet } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { colors, fonts, radii, shadows, spacing } from '@/constants/theme';

interface WalletCardProps {
  balance: number; // en centimes
}

export function WalletCard({ balance }: WalletCardProps) {
  const formatted = (balance / 100).toFixed(2).replace('.', ',') + ' €';

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Wallet size={20} color={colors.green} strokeWidth={1.6} />
      </View>
      <View>
        <Text style={styles.label}>PORTE-MONNAIE</Text>
        <Text style={styles.balance}>{formatted}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.subtle,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.textMuted,
    marginBottom: 2,
  },
  balance: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
});
