// Sélecteur de quantité (+/-)
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, fonts, radii, spacing } from '@/constants/theme';

interface QuantitySelectorProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
}

export function QuantitySelector({
  quantity,
  onIncrement,
  onDecrement,
  min = 0,
  max = 99,
}: QuantitySelectorProps) {
  return (
    <View style={styles.container}>
      <Pressable
        onPress={quantity > min ? onDecrement : undefined}
        style={[styles.button, quantity <= min && styles.disabled]}
        disabled={quantity <= min}
      >
        <Minus size={14} color={colors.text} strokeWidth={2} />
      </Pressable>
      <Text style={styles.quantity}>{quantity}</Text>
      <Pressable
        onPress={quantity < max ? onIncrement : undefined}
        style={[styles.button, quantity >= max && styles.disabled]}
        disabled={quantity >= max}
      >
        <Plus size={14} color={colors.text} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  quantity: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
});
