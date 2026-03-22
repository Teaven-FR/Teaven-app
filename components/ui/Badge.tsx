// Badge (pastille) — utilisé pour le compteur panier
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

interface BadgeProps {
  count: number;
  size?: number;
}

export function Badge({ count, size = 15 }: BadgeProps) {
  if (count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);
  // Pour 2 chiffres ou "99+", élargir le badge
  const minWidth = label.length > 1 ? size + 6 : size;

  return (
    <View
      style={[
        styles.badge,
        {
          minWidth,
          height: size,
          borderRadius: size / 2,
          paddingHorizontal: label.length > 1 ? 3 : 0,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.6 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
    position: 'absolute',
    top: -4,
    right: -6,
  },
  text: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: undefined,
  },
});
