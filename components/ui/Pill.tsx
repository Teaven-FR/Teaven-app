// Pill — filtre catégorie
import { Pressable, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';

interface PillProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function Pill({ label, active = false, onPress }: PillProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  label: {
    ...typography.pill,
    color: colors.textSecondary,
  },
  labelActive: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
});
