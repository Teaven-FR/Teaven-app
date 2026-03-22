// Sélecteur de modificateurs — radio (single) et checkbox (multiple)
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, fonts, spacing, radii } from '@/constants/theme';
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
    cents > 0 ? `+${(cents / 100).toFixed(2).replace('.', ',')} €` : null;

  // Un groupe single est considéré obligatoire
  const isRequired = group.type === 'single';

  return (
    <View style={styles.container}>
      {/* En-tête du groupe */}
      <View style={styles.header}>
        <Text style={styles.title}>{group.label}</Text>
        <View style={[styles.badge, isRequired ? styles.badgeRequired : styles.badgeOptional]}>
          <Text style={[styles.badgeText, isRequired ? styles.badgeTextRequired : styles.badgeTextOptional]}>
            {isRequired ? 'Obligatoire' : 'Optionnel'}
          </Text>
        </View>
      </View>

      {/* Options */}
      <View style={styles.options}>
        {group.options.map((option) => {
          const isActive = selected.includes(option.id);
          const supplement = formatSupplement(option.price);

          return (
            <Pressable
              key={option.id}
              onPress={() => onToggle(option.id)}
              style={({ pressed }) => [
                styles.optionRow,
                isActive && styles.optionRowActive,
                pressed && styles.optionRowPressed,
              ]}
              accessibilityLabel={option.label}
              accessibilityRole={group.type === 'single' ? 'radio' : 'checkbox'}
              accessibilityState={{ checked: isActive }}
            >
              {/* Indicateur radio / checkbox */}
              <View style={[
                group.type === 'single' ? styles.radio : styles.checkbox,
                isActive && (group.type === 'single' ? styles.radioActive : styles.checkboxActive),
              ]}>
                {group.type === 'single' && isActive && (
                  <View style={styles.radioDot} />
                )}
                {group.type === 'multiple' && isActive && (
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                )}
              </View>

              {/* Label de l'option */}
              <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                {option.label}
              </Text>

              {/* Prix supplémentaire */}
              {supplement && (
                <Text style={[styles.optionPrice, isActive && styles.optionPriceActive]}>
                  {supplement}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // En-tête
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.badge,
  },
  badgeRequired: {
    backgroundColor: '#FDF0EE',
  },
  badgeOptional: {
    backgroundColor: colors.greenLight,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  badgeTextRequired: {
    color: '#C0524A',
  },
  badgeTextOptional: {
    color: colors.green,
  },

  // Liste des options
  options: {
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#F9F9F6',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  optionRowActive: {
    backgroundColor: '#EEF4F0',
    borderColor: colors.green,
  },
  optionRowPressed: {
    opacity: 0.85,
  },
  optionLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  optionLabelActive: {
    fontFamily: fonts.bold,
    color: colors.greenDark,
  },
  optionPrice: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  optionPriceActive: {
    fontFamily: fonts.bold,
    color: colors.green,
  },

  // Radio
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.green,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },

  // Checkbox
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radii.badge,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
});
