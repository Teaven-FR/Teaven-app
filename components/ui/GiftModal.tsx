// Bottom sheet "Offrir un moment Teaven" — même mécanique que RechargeModal
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Gift, Coffee, UtensilsCrossed, Heart, Users, Phone, MessageSquare } from 'lucide-react-native';
import { callEdgeFunction } from '@/lib/square';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing } from '@/constants/theme';

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
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Handle + Close */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Titre */}
            <View style={styles.titleSection}>
              <Gift size={22} color="#C9918F" strokeWidth={1.3} />
              <Text style={styles.title}>Offrir un moment Teaven</Text>
              <Text style={styles.subtitle}>Faites plaisir à ceux que vous aimez</Text>
            </View>

            {/* Moments */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentsRow}>
              {MOMENTS.map((m) => {
                const active = selectedMoment === m.id;
                const Icon = m.icon;
                return (
                  <Pressable key={m.id} onPress={() => selectMoment(m.id)} style={[styles.momentCard, active && styles.momentCardActive]}>
                    <Icon size={18} color={active ? '#C9918F' : colors.textMuted} strokeWidth={1.5} />
                    <Text style={[styles.momentName, active && styles.momentNameActive]}>{m.name}</Text>
                    <Text style={[styles.momentPrice, active && styles.momentPriceActive]}>{fmt(m.amount)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

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
              <Phone size={14} color={colors.textMuted} strokeWidth={1.5} />
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Téléphone du destinataire" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
            </View>
            <View style={styles.inputWrap}>
              <MessageSquare size={14} color={colors.textMuted} strokeWidth={1.5} />
              <TextInput style={styles.input} value={message} onChangeText={setMessage} placeholder="Un petit mot (optionnel)" placeholderTextColor={colors.textMuted} maxLength={150} />
            </View>

            <Text style={styles.footnote}>Le montant est crédité sur le portefeuille Teaven du destinataire.</Text>
          </ScrollView>

          {/* CTA */}
          <Pressable
            onPress={handleSend}
            disabled={amount <= 0 || sending}
            style={[styles.cta, (amount <= 0 || sending) && { opacity: 0.4 }]}
          >
            {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
              <>
                <Gift size={16} color="#FFFFFF" strokeWidth={1.5} />
                <Text style={styles.ctaText}>Offrir {amount > 0 ? fmt(amount) : ''}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl, maxHeight: '85%',
  },
  handleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  handle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2 },
  closeBtn: { position: 'absolute', right: 0, top: 12 },

  titleSection: { alignItems: 'center', gap: 6, marginBottom: 20 },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },

  momentsRow: { gap: 10, paddingBottom: 16 },
  momentCard: {
    width: 130, backgroundColor: colors.surface, borderRadius: 14, padding: 14, gap: 6,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  momentCardActive: { borderColor: '#C9918F', backgroundColor: '#FDF2F1' },
  momentName: { fontFamily: fonts.bold, fontSize: 12, color: colors.text, textAlign: 'center' },
  momentNameActive: { color: '#B07A78' },
  momentPrice: { fontFamily: fonts.monoSemiBold, fontSize: 15, color: colors.textSecondary },
  momentPriceActive: { color: '#C9918F' },

  sectionLabel: { fontFamily: fonts.bold, fontSize: 9, letterSpacing: 2, color: colors.textMuted, marginBottom: 10 },
  freeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  freeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  freeChipActive: { borderColor: '#C9918F', backgroundColor: '#FDF2F1' },
  freeText: { fontFamily: fonts.monoSemiBold, fontSize: 14, color: colors.text },
  freeTextActive: { color: '#C9918F' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, marginBottom: 10,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, paddingVertical: 12 },

  footnote: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginVertical: 10, lineHeight: 16 },

  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#C9918F', borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  ctaText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },
});
