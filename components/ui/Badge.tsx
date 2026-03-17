// Badge (pastille) — utilisé pour le compteur panier
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '@/constants/theme';

interface BadgeProps {
  count: number;
  size?: number;
}

export function Badge({ count, size = 15 }: BadgeProps) {
  if (count <= 0) return null;

  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.6 }]}>
        {count > 99 ? '99+' : count}
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
    lineHeight: 14,
  },
});
