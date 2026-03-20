// Écran Modes de paiement — wallet + cartes bancaires
import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Plus, Wallet } from 'lucide-react-native';
import { RechargeModal } from '@/components/ui/RechargeModal';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

export default function PaiementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallet, rechargeWallet } = useUser();
  const { showToast } = useToast();
  const [rechargeVisible, setRechargeVisible] = useState(false);

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Modes de paiement</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Wallet */}
        <Text style={styles.sectionLabel}>WALLET TEAVEN</Text>
        <View style={styles.walletCard}>
          <View style={styles.walletLeft}>
            <View style={styles.walletIcon}>
              <Wallet size={18} color={colors.green} strokeWidth={1.8} />
            </View>
            <View>
              <Text style={styles.walletTitle}>Porte-monnaie</Text>
              <Text style={styles.walletBalance}>
                {formatPrice(wallet.balance)}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.rechargeButton}
            onPress={() => setRechargeVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Recharger le porte-monnaie"
          >
            <Text style={styles.rechargeText}>Recharger</Text>
          </Pressable>
        </View>

        {/* Section Cartes bancaires */}
        <Text style={styles.sectionLabel}>CARTES BANCAIRES</Text>
        <View style={styles.cardItem}>
          <View style={styles.cardIconWrap}>
            <CreditCard size={18} color={colors.green} strokeWidth={1.8} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>Visa</Text>
            <Text style={styles.cardNumber}>•••• •••• •••• 4242</Text>
          </View>
          <Text style={styles.cardExp}>12/27</Text>
        </View>

        {/* Bouton ajouter une carte */}
        <Pressable
          style={styles.addCardButton}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une carte bancaire"
        >
          <Plus size={18} color={colors.green} strokeWidth={2} />
          <Text style={styles.addCardText}>Ajouter une carte</Text>
        </Pressable>

        {/* Note sécurité */}
        <Text style={styles.securityNote}>
          Les paiements sont sécurisés par Square
        </Text>
      </ScrollView>

      {/* Modal rechargement */}
      <RechargeModal
        visible={rechargeVisible}
        onClose={() => setRechargeVisible(false)}
        onRecharge={(amount) => {
          rechargeWallet(amount);
          showToast('Porte-monnaie rechargé !');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },

  // Section labels
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.textMuted,
    marginBottom: spacing.md,
    marginTop: spacing.xl,
  },

  // Wallet
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    ...shadows.subtle,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  walletIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  walletBalance: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 16,
    color: colors.green,
    marginTop: 2,
  },
  rechargeButton: {
    height: 32,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.green,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // Carte bancaire
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: spacing.md,
    ...shadows.subtle,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  cardNumber: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardExp: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textMuted,
  },

  // Ajouter carte
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addCardText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.green,
  },

  // Note
  securityNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
