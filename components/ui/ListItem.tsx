// Élément de liste générique
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { colors, fonts, spacing, radii } from '@/constants/theme';

interface ListItemProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export function ListItem({
  icon,
  title,
  subtitle,
  right,
  onPress,
  showChevron = true,
}: ListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      disabled={!onPress}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View style={styles.right}>{right}</View>}
      {showChevron && onPress && (
        <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.6} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  right: {
    marginRight: spacing.sm,
  },
});
