// Sélecteur de modificateurs — taille et suppléments
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, fonts, spacing } from '@/constants/theme';
import type { ModifierGroup } from '@/lib/types';

// Re-export pour compatibilité
export type { ModifierGroup, ModifierOption } from '@/lib/types';

interface ModifierSelectorProps {
  group: ModifierGroup;
  selected: string[]; // ids sélectionnés
  onToggle: (modifierId: string) => void;
}

export function ModifierSelector({ group, selected, onToggle }: ModifierSelectorProps) {
  const formatSupplement = (cents: number) =>
    cents > 0 ? ` +${(cents / 100).toFixed(2).replace('.', ',')}€` : '';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{group.label}</Text>
      <View style={styles.chips}>
        {group.options.map((option) => {
          const isActive = selected.includes(option.id);
          return (
            <Pressable
              key={option.id}
              onPress={() => onToggle(option.id)}
              style={[styles.chip, isActive && styles.chipActive]}
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {option.label}{formatSupplement(option.price)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.green,
  },
  chipText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: {
    fontFamily: fonts.bold,
    color: '#FFFFFF',
  },
});
