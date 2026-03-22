// Écran carte cadeau — sélection montant, message, prévisualisation et envoi
import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Gift,
  MessageSquare,
  Smartphone,
  Mail,
} from 'lucide-react-native';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

/** Montants prédéfinis en euros */
const PRESET_AMOUNTS = [10, 25, 50, 100] as const;

/** Longueur maximale du message */
const MAX_MESSAGE_LENGTH = 150;

export default function GiftScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const [selectedAmount, setSelectedAmount] = useState<number | null>(25);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');

  // Animation de scale pour la carte sélectionnée
  const scaleAnim = useRef(new Animated.Value(1)).current;

  /** Montant effectif en euros */
  const effectiveAmount = isCustom
    ? parseInt(customAmount, 10) || 0
    : selectedAmount ?? 0;

  /** Sélectionner un montant prédéfini */
  const handlePresetSelect = (amount: number) => {
    setIsCustom(false);
    setSelectedAmount(amount);
    // Petite animation de rebond
    scaleAnim.setValue(0.95);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 8,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  /** Activer le montant personnalisé */
  const handleCustomSelect = () => {
    setIsCustom(true);
    setSelectedAmount(null);
  };

  /** Envoi par SMS via l'app native */
  const handleSendSMS = () => {
    if (effectiveAmount <= 0) {
      showToast('Veuillez choisir un montant', 'error');
      return;
    }
    const body = message.length > 0
      ? `Je t'offre une carte cadeau Teaven de ${effectiveAmount}\u00A0\u20AC ! \u00AB ${message} \u00BB`
      : `Je t'offre une carte cadeau Teaven de ${effectiveAmount}\u00A0\u20AC !`;
    const separator = Platform.OS === 'ios' ? '&' : '?';
    Linking.openURL(`sms:${separator}body=${encodeURIComponent(body)}`).catch(() => {
      showToast('Impossible d\'ouvrir l\'app SMS', 'error');
    });
  };

  /** Envoi par email via l'app native */
  const handleSendEmail = () => {
    if (effectiveAmount <= 0) {
      showToast('Veuillez choisir un montant', 'error');
      return;
    }
    const subject = encodeURIComponent(`Carte cadeau Teaven — ${effectiveAmount}\u00A0\u20AC`);
    const body = encodeURIComponent(
      message.length > 0
        ? `Bonjour,\n\nJe t'offre une carte cadeau Teaven de ${effectiveAmount}\u00A0\u20AC !\n\n\u00AB ${message} \u00BB\n\nÀ bientôt chez Teaven !`
        : `Bonjour,\n\nJe t'offre une carte cadeau Teaven de ${effectiveAmount}\u00A0\u20AC !\n\nÀ bientôt chez Teaven !`
    );
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => {
      showToast('Impossible d\'ouvrir l\'app email', 'error');
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ──── Header ──── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Retour"
            accessibilityRole="button"
          >
            <ChevronLeft size={24} color={colors.text} strokeWidth={1.3} />
          </Pressable>
          <Text style={styles.headerTitle}>Offrir un moment</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ──── Titre ──── */}
        <View style={styles.titleSection}>
          <View style={styles.titleIconWrap}>
            <Gift size={24} color={colors.green} strokeWidth={1.3} />
          </View>
          <Text style={styles.title}>Offrir un moment Teaven</Text>
          <Text style={styles.subtitle}>
            Faites plaisir à vos proches avec une carte cadeau utilisable en boutique et sur l'application.
          </Text>
        </View>

        {/* ──── Sélection du montant ──── */}
        <Text style={styles.sectionLabel}>MONTANT</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.amountsRow}
        >
          {PRESET_AMOUNTS.map((amount) => {
            const active = !isCustom && selectedAmount === amount;
            return (
              <Pressable
                key={amount}
                onPress={() => handlePresetSelect(amount)}
                style={[styles.amountCard, active && styles.amountCardActive]}
                accessibilityLabel={`${amount} euros`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.amountValue, active && styles.amountValueActive]}>
                  {amount}\u00A0\u20AC
                </Text>
              </Pressable>
            );
          })}

          {/* Carte montant personnalisé */}
          <Pressable
            onPress={handleCustomSelect}
            style={[styles.amountCard, isCustom && styles.amountCardActive]}
            accessibilityLabel="Montant personnalisé"
            accessibilityRole="button"
            accessibilityState={{ selected: isCustom }}
          >
            <Text style={[styles.amountValue, isCustom && styles.amountValueActive]}>
              Autre
            </Text>
          </Pressable>
        </ScrollView>

        {/* ──── Champ montant personnalisé ──── */}
        {isCustom && (
          <View style={styles.customInputWrap}>
            <TextInput
              style={styles.customInput}
              value={customAmount}
              onChangeText={(text) => setCustomAmount(text.replace(/[^0-9]/g, ''))}
              placeholder="Montant en euros"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel="Montant personnalisé"
            />
            <Text style={styles.customInputSuffix}>\u20AC</Text>
          </View>
        )}

        {/* ──── Message ──── */}
        <Text style={styles.sectionLabel}>MESSAGE</Text>
        <View style={styles.messageWrap}>
          <View style={styles.messageIconRow}>
            <MessageSquare size={16} color={colors.textMuted} strokeWidth={1.3} />
            <Text style={styles.messageCharCount}>
              {message.length}/{MAX_MESSAGE_LENGTH}
            </Text>
          </View>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={(text) => {
              if (text.length <= MAX_MESSAGE_LENGTH) setMessage(text);
            }}
            placeholder="Ajoutez un message..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            textAlignVertical="top"
            accessibilityLabel="Message de la carte cadeau"
          />
        </View>

        {/* ──── Prévisualisation de la carte ──── */}
        <Text style={styles.sectionLabel}>APERÇU</Text>
        <Animated.View style={[styles.previewWrapper, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#2C4A32', '#4A6B50', '#75967F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            {/* Cercles décoratifs */}
            <View style={styles.previewDecorCircle} />
            <View style={styles.previewDecorCircle2} />

            {/* Logo */}
            <Text style={styles.previewBrand}>TEAVEN</Text>

            {/* Montant */}
            <Text style={styles.previewAmount}>
              {effectiveAmount > 0 ? `${effectiveAmount}\u00A0\u20AC` : '—\u00A0\u20AC'}
            </Text>

            {/* Sous-titre */}
            <Text style={styles.previewLabel}>CARTE CADEAU</Text>

            {/* Message (aperçu) */}
            {message.length > 0 && (
              <Text style={styles.previewMessage} numberOfLines={2}>
                « {message} »
              </Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ──── Boutons d'envoi ──── */}
        <View style={styles.buttonsSection}>
          <Pressable
            style={styles.sendButton}
            onPress={handleSendSMS}
            accessibilityLabel="Envoyer par SMS"
            accessibilityRole="button"
          >
            <Smartphone size={18} color="#FFFFFF" strokeWidth={1.3} />
            <Text style={styles.sendButtonText}>Envoyer par SMS</Text>
          </Pressable>

          <Pressable
            style={styles.sendButtonOutline}
            onPress={handleSendEmail}
            accessibilityLabel="Envoyer par email"
            accessibilityRole="button"
          >
            <Mail size={18} color={colors.green} strokeWidth={1.3} />
            <Text style={styles.sendButtonOutlineText}>Envoyer par email</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  headerSpacer: {
    width: 24,
  },

  // Titre principal
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  titleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Section label
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.textMuted,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },

  // Montants
  amountsRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  amountCard: {
    width: 80,
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  amountCardActive: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
  },
  amountValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: colors.text,
  },
  amountValueActive: {
    color: colors.greenDark,
  },

  // Montant personnalisé
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  customInput: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.text,
    paddingVertical: 14,
  },
  customInputSuffix: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },

  // Message
  messageWrap: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  messageIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  messageCharCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
  },
  messageInput: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    lineHeight: 22,
  },

  // Prévisualisation
  previewWrapper: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  previewCard: {
    borderRadius: 20,
    padding: spacing.xxl,
    overflow: 'hidden',
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
    ...shadows.loyalty,
  },
  previewDecorCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewDecorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  previewBrand: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 6,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.lg,
  },
  previewAmount: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 40,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  previewLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.md,
  },
  previewMessage: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },

  // Boutons d'envoi
  buttonsSection: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.green,
    borderRadius: radii.card,
    paddingVertical: 14,
    ...shadows.card,
  },
  sendButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  sendButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderColor: colors.green,
    paddingVertical: 14,
  },
  sendButtonOutlineText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.green,
  },
});
