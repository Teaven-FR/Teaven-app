// Modal de rechargement wallet — design terracotta premium
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles, Wallet, Gift, Plus } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/constants/theme';

interface RechargeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecharge: (amount: number) => void;
}

const PRESET_OPTIONS = [
  { charge: 2000, bonus: 100, tagline: 'Un bon d\u00e9but' },
  { charge: 5000, bonus: 400, tagline: 'Le plus populaire' },
  { charge: 10000, bonus: 1200, tagline: 'Le meilleur bonus' },
];

export function RechargeModal({ visible, onClose, onRecharge }: RechargeModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const fmt = (cents: number) =>
    `${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace('.', ',')} \u20AC`;

  const handlePresetPress = (index: number) => {
    setSelectedIndex(index);
    setCustomAmount('');
  };

  const handleCustomChange = (text: string) => {
    setCustomAmount(text.replace(/[^0-9.,]/g, ''));
    setSelectedIndex(null);
  };

  const getCharge = (): number => {
    if (selectedIndex !== null) return PRESET_OPTIONS[selectedIndex].charge;
    const p = parseFloat(customAmount.replace(',', '.'));
    return isNaN(p) ? 0 : Math.round(p * 100);
  };

  const getBonus = (): number =>
    selectedIndex !== null ? PRESET_OPTIONS[selectedIndex].bonus : 0;

  const handleRecharge = () => {
    const charge = getCharge();
    const bonus = getBonus();
    if (charge > 0) {
      onRecharge(charge + bonus);
      setSelectedIndex(null);
      setCustomAmount('');
      onClose();
    }
  };

  const charge = getCharge();
  const bonus = getBonus();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={['#75967F', '#4A6B50', '#3A5840']}
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
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Rechargez votre solde</Text>
              <Text style={styles.subtitle}>Chaque recharge est un geste pour vous.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </Pressable>
          </View>

          {/* Explication du wallet */}
          <View style={styles.explainer}>
            <Text style={styles.explainerText}>
              Votre porte-monnaie Teaven simplifie chaque passage. Rechargez une fois, payez en un geste — et profitez d'un bonus offert à chaque recharge.
            </Text>
          </View>

          {/* Montants */}
          <View style={styles.presets}>
            {PRESET_OPTIONS.map((opt, i) => {
              const active = selectedIndex === i;
              return (
                <Pressable
                  key={opt.charge}
                  onPress={() => handlePresetPress(i)}
                  style={[styles.card, active && styles.cardActive]}
                >
                  {i === 1 && (
                    <View style={styles.popBadge}>
                      <Sparkles size={7} color="#75967F" strokeWidth={2.5} />
                      <Text style={styles.popText}>Populaire</Text>
                    </View>
                  )}
                  <Text style={[styles.cardAmount, active && styles.cardAmountActive]}>
                    {fmt(opt.charge)}
                  </Text>
                  <Text style={[styles.cardTag, active && styles.cardTagActive]}>{opt.tagline}</Text>
                  <View style={styles.cardBonus}>
                    <Gift size={10} color={active ? '#75967F' : 'rgba(255,255,255,0.5)'} strokeWidth={1.8} />
                    <Text style={[styles.cardBonusText, active && styles.cardBonusTextActive]}>
                      +{fmt(opt.bonus)} offerts
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Récap */}
          {selectedIndex !== null && (
            <View style={styles.recap}>
              <Text style={styles.recapText}>
                Vous payez {fmt(PRESET_OPTIONS[selectedIndex].charge)}, vous recevez{' '}
                <Text style={styles.recapBold}>
                  {fmt(PRESET_OPTIONS[selectedIndex].charge + PRESET_OPTIONS[selectedIndex].bonus)}
                </Text>
              </Text>
            </View>
          )}

          {/* Montant libre */}
          <View style={styles.customWrap}>
            <Text style={styles.customLabel}>Montant libre</Text>
            <View style={styles.customInput}>
              <TextInput
                style={styles.customText}
                value={customAmount}
                onChangeText={handleCustomChange}
                placeholder="0,00"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="decimal-pad"
              />
              <Text style={styles.customCurrency}>{'\u20AC'}</Text>
            </View>
          </View>

          {/* CTA */}
          <Pressable
            onPress={handleRecharge}
            disabled={charge <= 0}
            style={[styles.cta, charge <= 0 && styles.ctaDisabled]}
          >
            <Wallet size={16} color="#B56A4A" strokeWidth={1.5} />
            <Text style={styles.ctaText}>
              {charge > 0 ? `Recharger ${fmt(charge)}` : 'Choisissez un montant'}
            </Text>
            {bonus > 0 && (
              <View style={styles.ctaBadge}>
                <Plus size={10} color="#B56A4A" strokeWidth={2.5} />
                <Text style={styles.ctaBadgeText}>{fmt(bonus)}</Text>
              </View>
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
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
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
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },

  // Presets
  presets: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 6,
    gap: 4,
    position: 'relative',
  },
  cardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  popBadge: {
    position: 'absolute',
    top: -8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popText: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: '#B56A4A',
    letterSpacing: 0.3,
  },
  cardAmount: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
  },
  cardAmountActive: {
    color: '#B56A4A',
  },
  cardTag: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
  },
  cardTagActive: {
    color: '#B56A4A',
  },
  cardBonus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardBonusText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  cardBonusTextActive: {
    color: '#75967F',
  },

  // Recap
  recap: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  recapText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  recapBold: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },

  // Custom
  customWrap: {
    marginBottom: spacing.xl,
  },
  customLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  customInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.lg,
  },
  customText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 18,
    color: '#FFFFFF',
  },
  customCurrency: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
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
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#B56A4A',
  },
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(194,123,90,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ctaBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#B56A4A',
  },
});
