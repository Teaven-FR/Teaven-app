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

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000]; // 10€, 20€, 50€, 100€

export function RechargeModal({ visible, onClose, onRecharge }: RechargeModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const formatPreset = (cents: number) => `${cents / 100} €`;

  const handlePresetPress = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (text: string) => {
    // N'accepter que des chiffres et un point/virgule
    const cleaned = text.replace(/[^0-9.,]/g, '');
    setCustomAmount(cleaned);
    setSelectedPreset(null);
  };

  const getAmount = (): number => {
    if (selectedPreset) return selectedPreset;
    const parsed = parseFloat(customAmount.replace(',', '.'));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  };

  const handleRecharge = () => {
    const amount = getAmount();
    if (amount > 0) {
      onRecharge(amount);
      setSelectedPreset(null);
      setCustomAmount('');
      onClose();
    }
  };

  const amount = getAmount();

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

          {/* Montants prédéfinis */}
          <View style={styles.presetsGrid}>
            {PRESET_AMOUNTS.map((preset) => {
              const isActive = selectedPreset === preset;
              return (
                <Pressable
                  key={preset}
                  onPress={() => handlePresetPress(preset)}
                  style={[styles.presetCard, isActive && styles.presetCardActive]}
                >
                  <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                    {formatPreset(preset)}
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
            style={[styles.rechargeButton, amount <= 0 && styles.rechargeButtonDisabled]}
            disabled={amount <= 0}
          >
            <Text style={styles.rechargeButtonText}>
              Recharger{amount > 0 ? ` ${(amount / 100).toFixed(2).replace('.', ',')} €` : ''}
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
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetCardActive: {
    borderColor: colors.green,
    borderWidth: 1.5,
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
