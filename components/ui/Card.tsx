// Carte générique réutilisable
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.subtle,
  },
});
