// Pill — filtre catégorie (hauteur 32px, radius 50px)
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';

interface PillProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function Pill({ label, active = false, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
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
    height: 32,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
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
