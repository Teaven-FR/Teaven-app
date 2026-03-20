// Badge tag — étiquettes de catégorie et statut réutilisables
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

type BadgeVariant = 'green' | 'muted' | 'accent';
type BadgeSize = 'sm' | 'md';

interface TagBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  green: { bg: colors.greenLight, text: colors.green },
  muted: { bg: '#F5F5F0', text: colors.textSecondary },
  accent: { bg: colors.green, text: '#FFFFFF' },
};

export function TagBadge({ label, variant = 'green', size = 'sm' }: TagBadgeProps) {
  const v = VARIANT_STYLES[variant];
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: v.bg },
        isSm ? styles.sm : styles.md,
      ]}
      accessibilityRole="text"
    >
      <Text
        style={[
          styles.label,
          { color: v.text },
          isSm ? styles.labelSm : styles.labelMd,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 50,
  },
  sm: {
    height: 20,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  md: {
    height: 28,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bold,
  },
  labelSm: {
    fontSize: 9.5,
  },
  labelMd: {
    fontSize: 12,
  },
});
