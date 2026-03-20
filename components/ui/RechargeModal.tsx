// Modal de rechargement wallet
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors, fonts, spacing, radii } from '@/constants/theme';

interface RechargeModalProps {
  visible: boolean;
  onClose: () => void;
  onRecharge: (amount: number) => void; // montant en centimes
}

// Montants prédéfinis avec bonus fidélité
const PRESET_OPTIONS = [
  { charge: 1000, bonus: 100 },   // 10€ → 11€ (bonus +1€)
  { charge: 2000, bonus: 200 },   // 20€ → 22€ (bonus +2€)
  { charge: 5000, bonus: 500 },   // 50€ → 55€ (bonus +5€)
  { charge: 10000, bonus: 1500 }, // 100€ → 115€ (bonus +15€)
];

export function RechargeModal({ visible, onClose, onRecharge }: RechargeModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const formatEuros = (cents: number) => `${(cents / 100).toFixed(0)} €`;

  const handlePresetPress = (index: number) => {
    setSelectedIndex(index);
    setCustomAmount('');
  };

  const handleCustomChange = (text: string) => {
    // N'accepter que des chiffres et un point/virgule
    const cleaned = text.replace(/[^0-9.,]/g, '');
    setCustomAmount(cleaned);
    setSelectedIndex(null);
  };

  // Montant total crédité (charge + bonus pour les prédéfinis)
  const getCreditedAmount = (): number => {
    if (selectedIndex !== null) {
      const option = PRESET_OPTIONS[selectedIndex];
      return option.charge + option.bonus;
    }
    const parsed = parseFloat(customAmount.replace(',', '.'));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  // Montant débité (charge uniquement)
  const getChargeAmount = (): number => {
    if (selectedIndex !== null) return PRESET_OPTIONS[selectedIndex].charge;
    const parsed = parseFloat(customAmount.replace(',', '.'));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  const handleRecharge = () => {
    const credited = getCreditedAmount();
    if (credited > 0) {
      onRecharge(credited);
      setSelectedIndex(null);
      setCustomAmount('');
      onClose();
    }
  };

  const creditedAmount = getCreditedAmount();
  const chargeAmount = getChargeAmount();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Recharger mon porte-monnaie</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Montants prédéfinis avec bonus */}
          {selectedIndex !== null && (
            <View style={styles.bonusBanner}>
              <Text style={styles.bonusBannerText}>
                Chargez {formatEuros(PRESET_OPTIONS[selectedIndex].charge)}, recevez{' '}
                {formatEuros(PRESET_OPTIONS[selectedIndex].charge + PRESET_OPTIONS[selectedIndex].bonus)}
              </Text>
            </View>
          )}
          <View style={styles.presetsGrid}>
            {PRESET_OPTIONS.map((option, index) => {
              const isActive = selectedIndex === index;
              return (
                <Pressable
                  key={option.charge}
                  onPress={() => handlePresetPress(index)}
                  style={[styles.presetCard, isActive && styles.presetCardActive]}
                >
                  <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                    {formatEuros(option.charge)}
                  </Text>
                  <Text style={styles.receivedText}>
                    → {formatEuros(option.charge + option.bonus)} crédités
                  </Text>
                  <Text style={styles.bonusText}>
                    +{formatEuros(option.bonus)} offerts
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Montant libre */}
          <View style={styles.customInputWrap}>
            <Text style={styles.customLabel}>Autre montant</Text>
            <View style={styles.customInput}>
              <TextInput
                style={styles.customInputText}
                value={customAmount}
                onChangeText={handleCustomChange}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.currencySymbol}>€</Text>
            </View>
          </View>

          {/* Bouton recharger */}
          <Pressable
            onPress={handleRecharge}
            style={[styles.rechargeButton, chargeAmount <= 0 && styles.rechargeButtonDisabled]}
            disabled={chargeAmount <= 0}
          >
            <Text style={styles.rechargeButtonText}>
              Recharger{chargeAmount > 0 ? ` ${(chargeAmount / 100).toFixed(2).replace('.', ',')} €` : ''}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Montants prédéfinis
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  presetCard: {
    width: '47%',
    height: 84,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  presetCardActive: {
    borderColor: colors.green,
    backgroundColor: '#F0F5F1',
  },
  presetText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  presetTextActive: {
    color: colors.green,
  },
  receivedText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  bonusText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
  bonusBanner: {
    backgroundColor: '#F0F5F1',
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  bonusBannerText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
    textAlign: 'center',
  },

  // Montant libre
  customInputWrap: {
    marginBottom: spacing.xxl,
  },
  customLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  customInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  customInputText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.text,
  },
  currencySymbol: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.textMuted,
  },

  // Bouton recharger
  rechargeButton: {
    height: 48,
    backgroundColor: colors.green,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rechargeButtonDisabled: {
    opacity: 0.5,
  },
  rechargeButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
