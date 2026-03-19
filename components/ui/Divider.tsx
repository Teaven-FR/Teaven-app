// Divider — ligne de séparation simple
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface DividerProps {
  /** Espacement au-dessus et en-dessous (défaut 16px) */
  gap?: number;
}

export function Divider({ gap = spacing.lg }: DividerProps) {
  return (
    <View style={[styles.line, { marginVertical: gap }]} />
  );
}

const styles = StyleSheet.create({
  line: {
    height: 0.5,
    backgroundColor: colors.border,
  },
});
