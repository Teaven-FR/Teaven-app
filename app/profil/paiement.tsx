// Écran Modes de paiement — wallet Square + cartes bancaires gérées en local
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CreditCard, Plus, Wallet, Trash2, RefreshCw } from 'lucide-react-native';
import { RechargeModal } from '@/components/ui/RechargeModal';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { fetchWalletBalance } from '@/lib/square';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, spacing, shadows, radii } from '@/constants/theme';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
}

const INITIAL_CARDS: SavedCard[] = [
  { id: 'c1', brand: 'Visa', last4: '4242', expiry: '12/27' },
];

export default function PaiementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { wallet, rechargeWallet } = useUser();
  const { showToast } = useToast();

  const [rechargeVisible, setRechargeVisible] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>(INITIAL_CARDS);
  const [addCardVisible, setAddCardVisible] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Rafraîchir le solde depuis Square Gift Cards au montage
  useEffect(() => {
    refreshBalance();
  }, []);

  const refreshBalance = async () => {
    setBalanceLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const result = await fetchWalletBalance(session.access_token);
      if (result.data?.success && result.data.balance !== undefined) {
        const { setUser } = useAuthStore.getState();
        const current = useAuthStore.getState().user;
        if (current) setUser({ ...current, walletBalance: result.data.balance });
      }
    } finally {
      setBalanceLoading(false);
    }
  };

  // Champs du formulaire carte
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');

  const formatPrice = (cents: number) =>
    (cents / 100).toFixed(2).replace('.', ',') + ' €';

  const deleteCard = (id: string) => {
    Alert.alert(
      'Supprimer la carte',
      'Voulez-vous vraiment supprimer cette carte ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => setCards((prev) => prev.filter((c) => c.id !== id)),
        },
      ],
    );
  };

  const addCard = () => {
    if (!cardNumber || cardNumber.length < 4 || !cardExpiry) return;
    const last4 = cardNumber.replace(/\s/g, '').slice(-4);
    const brand = cardNumber.startsWith('4') ? 'Visa' :
      cardNumber.startsWith('5') ? 'Mastercard' : 'Carte';
    setCards((prev) => [
      ...prev,
      { id: Date.now().toString(), brand, last4, expiry: cardExpiry },
    ]);
    setAddCardVisible(false);
    setCardName('');
    setCardNumber('');
    setCardExpiry('');
    showToast('Carte ajoutée');
  };

  /** Formater le numéro de carte par blocs de 4 */
  const formatCardNumber = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  /** Formater la date d'expiration MM/YY */
  const formatExpiry = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

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
          <View style={styles.walletTop}>
            <View style={styles.walletIcon}>
              <Wallet size={20} color="#FFFFFF" strokeWidth={1.8} />
            </View>
            <Pressable
              onPress={refreshBalance}
              hitSlop={8}
              accessibilityLabel="Rafraîchir le solde"
              style={styles.refreshBtn}
            >
              {balanceLoading
                ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                : <RefreshCw size={16} color="rgba(255,255,255,0.7)" strokeWidth={1.8} />
              }
            </Pressable>
          </View>
          <Text style={styles.walletBalanceLabel}>Solde disponible</Text>
          <Text style={styles.walletBalanceLarge}>
            {formatPrice(wallet.balance)}
          </Text>
          <View style={styles.walletActions}>
            <Pressable
              style={styles.rechargeButton}
              onPress={() => setRechargeVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Recharger le porte-monnaie"
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.rechargeText}>Recharger</Text>
            </Pressable>
          </View>
        </View>

        {/* Section Cartes bancaires */}
        <Text style={styles.sectionLabel}>CARTES BANCAIRES</Text>
        {cards.map((card) => (
          <View key={card.id} style={styles.cardItem}>
            <View style={styles.cardIconWrap}>
              <CreditCard size={18} color={colors.green} strokeWidth={1.8} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{card.brand}</Text>
              <Text style={styles.cardNumber}>•••• •••• •••• {card.last4}</Text>
            </View>
            <Text style={styles.cardExp}>{card.expiry}</Text>
            <Pressable
              onPress={() => deleteCard(card.id)}
              style={styles.deleteCardBtn}
              hitSlop={8}
              accessibilityLabel="Supprimer la carte"
            >
              <Trash2 size={15} color={colors.error} strokeWidth={1.8} />
            </Pressable>
          </View>
        ))}

        {/* Bouton ajouter une carte */}
        <Pressable
          style={styles.addCardButton}
          onPress={() => setAddCardVisible(true)}
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

      {/* Modal ajout carte */}
      <Modal
        visible={addCardVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddCardVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Ajouter une carte</Text>

            <TextInput
              style={styles.input}
              placeholder="Nom sur la carte"
              placeholderTextColor={colors.textMuted}
              value={cardName}
              onChangeText={setCardName}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.input}
              placeholder="Numéro de carte"
              placeholderTextColor={colors.textMuted}
              value={cardNumber}
              onChangeText={(t) => setCardNumber(formatCardNumber(t))}
              keyboardType="numeric"
              maxLength={19}
            />
            <TextInput
              style={styles.input}
              placeholder="MM/AA"
              placeholderTextColor={colors.textMuted}
              value={cardExpiry}
              onChangeText={(t) => setCardExpiry(formatExpiry(t))}
              keyboardType="numeric"
              maxLength={5}
            />

            <Text style={styles.securityNote}>
              Votre carte est sécurisée par Square. Nous ne stockons aucun numéro.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setAddCardVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveBtn,
                  (!cardNumber || cardNumber.length < 19 || !cardExpiry) && { opacity: 0.5 },
                ]}
                onPress={addCard}
                disabled={!cardNumber || cardNumber.length < 19 || !cardExpiry}
              >
                <Text style={styles.saveBtnText}>Ajouter</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: colors.green,
    borderRadius: 18,
    padding: 20,
    ...shadows.card,
  },
  walletTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  walletIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBalanceLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  walletBalanceLarge: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 36,
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -1,
  },
  walletActions: {
    flexDirection: 'row',
    marginTop: spacing.xl,
  },
  rechargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  rechargeText: {
    fontFamily: fonts.bold,
    fontSize: 13,
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
    marginBottom: spacing.sm,
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
  deleteCardBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFF0EF',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderStyle: 'dashed',
    gap: spacing.sm,
    marginTop: spacing.sm,
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

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xxl,
    paddingBottom: 40,
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  input: {
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
