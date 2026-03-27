// ✅ CHANTIER 6 — Offrir un moment Teaven
// Fusion Carte Cadeau + Wallet : offrir du crédit wallet via un code unique
// Montant libre (10/25/50/100€) + Moments pré-packagés
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Gift,
  MessageSquare,
  Heart,
  Coffee,
  UtensilsCrossed,
  Users,
  Phone,
} from 'lucide-react-native';
import { useToast } from '@/contexts/ToastContext';
import { callEdgeFunction } from '@/lib/square';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

/** Montants libres en centimes */
const FREE_AMOUNTS = [
  { value: 1000, label: '10 €' },
  { value: 2500, label: '25 €' },
  { value: 5000, label: '50 €' },
  { value: 10000, label: '100 €' },
] as const;

/** Moments pré-packagés */
const MOMENTS = [
  {
    id: 'pause-sucree',
    name: 'Une pause sucrée',
    description: 'Un goûter, une pâtisserie, un moment doux',
    amount: 1200,
    icon: Coffee,
    gradient: ['#E8DCC8', '#D4BC8B'] as const,
  },
  {
    id: 'repas-midi',
    name: 'Un repas du midi',
    description: 'De quoi se faire plaisir sur la pause déjeuner',
    amount: 2000,
    icon: UtensilsCrossed,
    gradient: ['#D4C4A0', '#C8A96E'] as const,
  },
  {
    id: 'brunch',
    name: 'Un brunch',
    description: "L'expérience Teaven en solo",
    amount: 3000,
    icon: Heart,
    gradient: ['#C8A96E', '#B59A5E'] as const,
  },
  {
    id: 'brunch-deux',
    name: 'Un brunch pour deux',
    description: 'Deux brunchs complets, le moment à partager',
    amount: 6000,
    icon: Users,
    gradient: ['#B59A5E', '#A08A50'] as const,
  },
] as const;

const MAX_MESSAGE_LENGTH = 150;

type SelectionMode = 'free' | 'moment';

export default function GiftScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();

  const [mode, setMode] = useState<SelectionMode>('moment');
  const [selectedFreeAmount, setSelectedFreeAmount] = useState<number | null>(null);
  const [selectedMoment, setSelectedMoment] = useState<string | null>('pause-sucree');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [giftCode, setGiftCode] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const effectiveAmount = mode === 'free'
    ? (selectedFreeAmount ?? 0)
    : (MOMENTS.find((m) => m.id === selectedMoment)?.amount ?? 0);

  const momentName = mode === 'moment'
    ? MOMENTS.find((m) => m.id === selectedMoment)?.name
    : undefined;

  const fmt = (cents: number) => `${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

  const handleSelectFreeAmount = (value: number) => {
    setMode('free');
    setSelectedFreeAmount(value);
    setSelectedMoment(null);
    scaleAnim.setValue(0.95);
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handleSelectMoment = (id: string) => {
    setMode('moment');
    setSelectedMoment(id);
    setSelectedFreeAmount(null);
    scaleAnim.setValue(0.95);
    Animated.spring(scaleAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const handleSend = async () => {
    if (effectiveAmount <= 0) {
      showToast('Veuillez choisir un montant', 'error');
      return;
    }
    const phone = recipientPhone.replace(/\s/g, '');
    if (!phone || phone.length < 10) {
      showToast('Veuillez entrer un numéro de téléphone valide', 'error');
      return;
    }

    setIsSending(true);
    try {
      const result = await callEdgeFunction<{
        success: boolean;
        code: string;
        error?: string;
      }>('create-gift', {
        recipientPhone: phone,
        amount: effectiveAmount,
        message,
        momentName,
      });

      if (result.error || !result.data?.success) {
        showToast(result.error ?? result.data?.error ?? 'Erreur', 'error');
        return;
      }

      setGiftCode(result.data.code);
      showToast('Cadeau envoyé avec succès !', 'success');
    } catch (err) {
      showToast('Erreur lors de l\'envoi', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // ── Écran de succès ──
  if (giftCode) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Gift size={32} color={colors.green} strokeWidth={1.3} />
          </View>
          <Text style={styles.successTitle}>Cadeau envoyé !</Text>
          <Text style={styles.successSubtitle}>
            {momentName
              ? `"${momentName}" — ${fmt(effectiveAmount)}`
              : fmt(effectiveAmount)}
          </Text>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Code cadeau</Text>
            <Text style={styles.codeValue}>{giftCode}</Text>
          </View>
          <Text style={styles.successHint}>
            Le destinataire pourra utiliser ce code dans l'app Teaven pour créditer son portefeuille.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.successBtn}>
            <Text style={styles.successBtnText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header doré miel — univers Offrir */}
        <LinearGradient colors={['#D4BC8B', '#C8A96E']} style={styles.heroHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.heroBack}>
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={1.5} />
          </Pressable>
          <Gift size={32} color="#FFFFFF" strokeWidth={1.2} />
          <Text style={styles.heroTitle}>Offrir un moment Teaven</Text>
          <Text style={styles.heroSubtitle}>
            Parce que les plus beaux cadeaux sont ceux qui se partagent.{'\n'}Offrez une pause, un repas, un moment de bien-être.
          </Text>
        </LinearGradient>

        {/* ──── Moments pré-packagés ──── */}
        <Text style={styles.sectionLabel}>NOS MOMENTS</Text>
        <View style={styles.momentsGrid}>
          {MOMENTS.map((moment) => {
            const active = mode === 'moment' && selectedMoment === moment.id;
            const Icon = moment.icon;
            return (
              <Pressable
                key={moment.id}
                onPress={() => handleSelectMoment(moment.id)}
                style={[styles.momentCard, active && styles.momentCardActive]}
              >
                <LinearGradient
                  colors={[...moment.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.momentGradient}
                >
                  <Icon size={18} color="#FFFFFF" strokeWidth={1.5} />
                </LinearGradient>
                <Text style={[styles.momentName, active && styles.momentNameActive]} numberOfLines={1}>
                  {moment.name}
                </Text>
                <Text style={styles.momentDesc} numberOfLines={1}>{moment.description}</Text>
                <Text style={[styles.momentPrice, active && styles.momentPriceActive]}>
                  {fmt(moment.amount)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.momentFootnote}>
          Le montant est crédité sur le portefeuille Teaven du destinataire. Il choisit ce qui lui fait envie.
        </Text>

        {/* ──── Montant libre ──── */}
        <Text style={styles.sectionLabel}>OU CHOISISSEZ UN MONTANT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freeRow}>
          {FREE_AMOUNTS.map((a) => {
            const active = mode === 'free' && selectedFreeAmount === a.value;
            return (
              <Pressable
                key={a.value}
                onPress={() => handleSelectFreeAmount(a.value)}
                style={[styles.freeCard, active && styles.freeCardActive]}
              >
                <Text style={[styles.freeValue, active && styles.freeValueActive]}>{a.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ──── Destinataire ──── */}
        <Text style={styles.sectionLabel}>DESTINATAIRE</Text>
        <View style={styles.phoneWrap}>
          <Phone size={16} color={colors.textMuted} strokeWidth={1.5} />
          <TextInput
            style={styles.phoneInput}
            value={recipientPhone}
            onChangeText={setRecipientPhone}
            placeholder="Numéro de téléphone"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        {/* ──── Message ──── */}
        <Text style={styles.sectionLabel}>MESSAGE (OPTIONNEL)</Text>
        <View style={styles.messageWrap}>
          <View style={styles.messageHeader}>
            <MessageSquare size={14} color={colors.textMuted} strokeWidth={1.3} />
            <Text style={styles.messageCount}>{message.length}/{MAX_MESSAGE_LENGTH}</Text>
          </View>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={(t) => t.length <= MAX_MESSAGE_LENGTH && setMessage(t)}
            placeholder="Ajoutez un message..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            textAlignVertical="top"
          />
        </View>

        {/* ──── Aperçu ──── */}
        <Animated.View style={[styles.previewWrap, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#2C4A32', '#4A6B50', '#75967F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.previewCard}
          >
            <View style={styles.previewDecor1} />
            <View style={styles.previewDecor2} />
            <Text style={styles.previewBrand}>TEAVEN</Text>
            {momentName && <Text style={styles.previewMoment}>{momentName}</Text>}
            <Text style={styles.previewAmount}>
              {effectiveAmount > 0 ? fmt(effectiveAmount) : '— €'}
            </Text>
            <Text style={styles.previewLabel}>OFFRIR UN MOMENT</Text>
            {message.length > 0 && (
              <Text style={styles.previewMessage} numberOfLines={2}>« {message} »</Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ──── CTA ──── */}
        <View style={[styles.ctaSection, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable
            onPress={handleSend}
            style={[styles.ctaButton, (isSending || effectiveAmount <= 0) && { opacity: 0.5 }]}
            disabled={isSending || effectiveAmount <= 0}
          >
            {isSending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Gift size={18} color="#FFFFFF" strokeWidth={1.5} />
                <Text style={styles.ctaText}>
                  Offrir {effectiveAmount > 0 ? fmt(effectiveAmount) : ''}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6EE' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },

  // Hero header terracotta
  heroHeader: {
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl,
    alignItems: 'center', gap: 10, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  heroBack: { position: 'absolute', top: spacing.lg, left: spacing.xl },
  heroTitle: { fontFamily: fonts.bold, fontSize: 22, color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.3 },
  heroSubtitle: { fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },

  introSection: { alignItems: 'center', paddingHorizontal: spacing.xl, marginBottom: spacing.xxl },
  introIconWrap: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.greenLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  introTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  introSubtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  sectionLabel: {
    fontFamily: fonts.bold, fontSize: 10, letterSpacing: 3, color: colors.textMuted,
    paddingHorizontal: spacing.xl, marginBottom: spacing.md, marginTop: spacing.lg,
  },

  // Moments pré-packagés — grille 2×2
  momentsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: 12,
  },
  momentCard: {
    width: '47%' as any, backgroundColor: colors.surface, borderRadius: radii.card,
    borderWidth: 1.5, borderColor: colors.border, padding: 14, ...shadows.subtle,
  },
  momentCardActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  momentGradient: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  momentName: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, marginBottom: 3 },
  momentNameActive: { color: colors.greenDark },
  momentDesc: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.textSecondary, marginBottom: 8, lineHeight: 14 },
  momentPrice: { fontFamily: fonts.monoSemiBold, fontSize: 15, color: colors.text },
  momentPriceActive: { color: colors.greenDark },
  momentFootnote: {
    fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center',
    paddingHorizontal: spacing.xxl, marginTop: spacing.md, lineHeight: 16,
  },

  // Montants libres
  freeRow: { paddingHorizontal: spacing.xl, gap: spacing.md },
  freeCard: {
    width: 76, height: 76, backgroundColor: colors.surface, borderRadius: radii.card,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    ...shadows.subtle,
  },
  freeCardActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  freeValue: { fontFamily: fonts.monoSemiBold, fontSize: 17, color: colors.text },
  freeValueActive: { color: colors.greenDark },

  // Destinataire
  phoneWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: spacing.xl, backgroundColor: colors.surface,
    borderRadius: radii.card, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingVertical: 4,
  },
  phoneInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 14 },

  // Message
  messageWrap: {
    marginHorizontal: spacing.xl, backgroundColor: colors.surface,
    borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  messageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  messageCount: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted },
  messageInput: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, minHeight: 60, lineHeight: 22 },

  // Aperçu
  previewWrap: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  previewCard: {
    borderRadius: 20, padding: spacing.xxl, overflow: 'hidden',
    alignItems: 'center', minHeight: 200, justifyContent: 'center', ...shadows.loyalty,
  },
  previewDecor1: {
    position: 'absolute', top: -30, right: -30, width: 120, height: 120,
    borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewDecor2: {
    position: 'absolute', bottom: -40, left: -20, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  previewBrand: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 6, color: 'rgba(255,255,255,0.5)', marginBottom: spacing.sm },
  previewMoment: { fontFamily: fonts.bold, fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: spacing.xs },
  previewAmount: { fontFamily: fonts.monoSemiBold, fontSize: 40, color: '#FFFFFF', marginBottom: spacing.sm },
  previewLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.5)', marginBottom: spacing.md },
  previewMessage: {
    fontFamily: fonts.regular, fontSize: 13, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', fontStyle: 'italic', lineHeight: 20, paddingHorizontal: spacing.lg,
  },

  // CTA
  ctaSection: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: '#C8A96E', borderRadius: radii.card, paddingVertical: 16, ...shadows.card,
  },
  ctaText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },

  // Succès
  successCard: {
    backgroundColor: colors.surface, borderRadius: 24, padding: 32,
    marginHorizontal: spacing.xl, alignItems: 'center', ...shadows.card,
  },
  successIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.greenLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  successTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: spacing.sm },
  successSubtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center' },
  codeCard: {
    backgroundColor: colors.bg, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16,
    alignItems: 'center', marginBottom: spacing.lg, width: '100%',
  },
  codeLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, color: colors.textMuted, marginBottom: 6 },
  codeValue: { fontFamily: fonts.monoSemiBold, fontSize: 24, color: colors.green, letterSpacing: 2 },
  successHint: {
    fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center',
    lineHeight: 18, marginBottom: spacing.xl,
  },
  successBtn: {
    backgroundColor: colors.green, borderRadius: radii.card, paddingVertical: 14, paddingHorizontal: 40,
  },
  successBtnText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF' },
});
