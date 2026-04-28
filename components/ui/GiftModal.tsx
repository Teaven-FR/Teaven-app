// Bottom sheet "Offrir un moment Teaven" — design vert doux premium (miroir layout RechargeModal)
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Gift, Coffee, UtensilsCrossed, Heart, Users, Phone, MessageSquare } from 'lucide-react-native';
import { callEdgeFunction } from '@/lib/square';
import { useToast } from '@/contexts/ToastContext';
import { fonts, spacing } from '@/constants/theme';

// Palette verte dédiée "Offrir un moment" — NE PAS utiliser terracotta ici
const GREEN = {
  dark: '#6B8E73',
  mid: '#7FA486',
  light: '#A8C5A0',
} as const;

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
}

const MOMENTS = [
  { id: 'pause', name: 'Une pause sucrée', amount: 1200, icon: Coffee, desc: 'Un goûter, un moment doux' },
  { id: 'midi', name: 'Un repas du midi', amount: 2000, icon: UtensilsCrossed, desc: 'Pause déjeuner plaisir' },
  { id: 'brunch', name: 'Un brunch', amount: 3000, icon: Heart, desc: "L'expérience Teaven solo" },
  { id: 'duo', name: 'Un brunch pour deux', amount: 6000, icon: Users, desc: 'Le moment à partager' },
] as const;

const FREE_AMOUNTS = [1000, 2500, 5000, 10000] as const;

export function GiftModal({ visible, onClose }: GiftModalProps) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [selectedMoment, setSelectedMoment] = useState<string | null>('pause');
  const [selectedFree, setSelectedFree] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeMomentIndex, setActiveMomentIndex] = useState(0);

  const handleMomentScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / 140); // card width (130) + gap (10)
    setActiveMomentIndex(index);
  }, []);

  const amount = selectedFree ?? MOMENTS.find((m) => m.id === selectedMoment)?.amount ?? 0;
  const fmt = (c: number) => `${(c / 100).toFixed(c % 100 === 0 ? 0 : 2).replace('.', ',')} €`;

  const selectMoment = (id: string) => { setSelectedMoment(id); setSelectedFree(null); };
  const selectFree = (v: number) => { setSelectedFree(v); setSelectedMoment(null); };

  const handleSend = async () => {
    if (amount <= 0 || phone.replace(/\s/g, '').length < 10) {
      showToast('Entrez un numéro de téléphone valide', 'error');
      return;
    }
    setSending(true);
    try {
      const result = await callEdgeFunction<{ success: boolean; code: string; error?: string }>(
        'create-gift',
        { recipientPhone: phone.replace(/\s/g, ''), amount, message, momentName: MOMENTS.find((m) => m.id === selectedMoment)?.name },
      );
      if (result.error || !result.data?.success) {
        showToast(result.error ?? 'Erreur', 'error');
      } else {
        showToast(`Cadeau envoyé ! Code : ${result.data.code}`);
        onClose();
        setPhone(''); setMessage(''); setSelectedMoment('pause'); setSelectedFree(null);
      }
    } catch {
      showToast('Erreur réseau', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[GREEN.light, GREEN.mid, GREEN.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 8 }]}
        >
          {/* Décors */}
          <View style={styles.decor1} />
          <View style={styles.decor2} />

          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            <View style={styles.headerCenter}>
              <Text style={styles.title}>Offrir un moment Teaven</Text>
              <Text style={styles.subtitle}>Faites plaisir à ceux que vous aimez</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          {/* Explication */}
          <View style={styles.explainer}>
            <Text style={styles.explainerText}>
              Offrez un moment gourmand chez Teaven. Le montant est crédité sur le portefeuille du destinataire.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Moments pré-définis */}
            <Text style={styles.sectionLabel}>CHOISIR UN MOMENT</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.momentsRow}
              onScroll={handleMomentScroll}
              scrollEventThrottle={16}
            >
              {MOMENTS.map((m) => {
                const active = selectedMoment === m.id;
                const Icon = m.icon;
                return (
                  <Pressable key={m.id} onPress={() => selectMoment(m.id)} style={[styles.card, active && styles.cardActive]}>
                    <Icon size={18} color={active ? GREEN.dark : '#FFFFFF'} strokeWidth={1.5} />
                    <Text style={[styles.cardName, active && styles.cardNameActive]}>{m.name}</Text>
                    <Text style={[styles.cardAmount, active && styles.cardAmountActive]}>{fmt(m.amount)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Dots pagination moments */}
            <View style={styles.dotsRow}>
              {MOMENTS.map((m, i) => (
                <View key={m.id} style={[styles.dot, i === activeMomentIndex && styles.dotActive]} />
              ))}
            </View>

            {/* Montants libres */}
            <Text style={styles.sectionLabel}>OU UN MONTANT LIBRE</Text>
            <View style={styles.freeRow}>
              {FREE_AMOUNTS.map((v) => {
                const active = selectedFree === v;
                return (
                  <Pressable key={v} onPress={() => selectFree(v)} style={[styles.freeChip, active && styles.freeChipActive]}>
                    <Text style={[styles.freeText, active && styles.freeTextActive]}>{fmt(v)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Destinataire */}
            <View style={styles.inputWrap}>
              <Phone size={14} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Téléphone du destinataire"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputWrap}>
              <MessageSquare size={14} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Un petit mot (optionnel)"
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={150}
              />
            </View>
          </ScrollView>

          {/* CTA */}
          <Pressable
            onPress={handleSend}
            disabled={amount <= 0 || sending}
            style={[styles.cta, (amount <= 0 || sending) && styles.ctaDisabled]}
          >
            {sending ? <ActivityIndicator color={GREEN.dark} size="small" /> : (
              <>
                <Gift size={16} color={GREEN.dark} strokeWidth={1.5} />
                <Text style={styles.ctaText}>
                  {amount > 0 ? `Offrir ${fmt(amount)}` : 'Choisissez un moment'}
                </Text>
              </>
            )}
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    position: 'relative',
    overflow: 'hidden',
    maxHeight: '88%',
  },
  decor1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  decor2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 2,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    textAlign: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Explainer
  explainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.xl,
  },
  explainerText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },

  // Section label
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
  },

  // Dots pagination
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    width: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
  },

  // Moments (horizontal cards)
  momentsRow: {
    gap: 10,
    paddingBottom: spacing.md,
  },
  card: {
    width: 130,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 6,
    gap: 4,
  },
  cardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  cardName: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardNameActive: {
    color: GREEN.dark,
  },
  cardAmount: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
  },
  cardAmountActive: {
    color: GREEN.mid,
  },

  // Free amounts
  freeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  freeChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  freeChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  freeText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  freeTextActive: {
    color: GREEN.dark,
  },

  // Inputs
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#FFFFFF',
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
    marginTop: 8,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: GREEN.dark,
  },
});
