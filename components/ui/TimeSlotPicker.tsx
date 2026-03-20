/**
 * TimeSlotPicker — Grille de sélection de créneau horaire
 * ScrollView horizontal avec le premier créneau "Dès que possible"
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Clock, Zap } from 'lucide-react-native';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

/** Créneau horaire */
export interface TimeSlot {
  id: string;
  /** Plage horaire affichée (ex. "12h00 - 12h15") — vide pour "Dès que possible" */
  timeRange: string;
  /** Nombre de commandes en file d'attente */
  queueCount: number;
  /** Créneau disponible ou non */
  available: boolean;
  /** Premier créneau spécial "dès que possible" */
  isAsap?: boolean;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function TimeSlotPicker({ slots, selectedId, onSelect }: TimeSlotPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {slots.map((slot) => {
        const isSelected = slot.id === selectedId;
        const isDisabled = !slot.available;

        return (
          <Pressable
            key={slot.id}
            style={[
              styles.slotCard,
              isSelected && styles.slotCardSelected,
              isDisabled && styles.slotCardDisabled,
            ]}
            onPress={() => {
              if (!isDisabled) onSelect(slot.id);
            }}
            disabled={isDisabled}
          >
            {/* Icône */}
            <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
              {slot.isAsap ? (
                <Zap
                  size={16}
                  color={isSelected ? colors.surface : colors.green}
                  strokeWidth={1.3}
                />
              ) : (
                <Clock
                  size={16}
                  color={isSelected ? colors.surface : isDisabled ? colors.textMuted : colors.green}
                  strokeWidth={1.3}
                />
              )}
            </View>

            {/* Plage horaire ou label ASAP */}
            {slot.isAsap ? (
              <Text
                style={[
                  styles.asapText,
                  isSelected && styles.textSelected,
                ]}
              >
                Dès que{'\n'}possible
              </Text>
            ) : (
              <Text
                style={[
                  styles.timeText,
                  isSelected && styles.textSelected,
                  isDisabled && styles.textDisabled,
                ]}
                numberOfLines={2}
              >
                {slot.timeRange}
              </Text>
            )}

            {/* Nombre en file d'attente */}
            <Text
              style={[
                styles.queueText,
                isSelected && styles.queueTextSelected,
                isDisabled && styles.textDisabled,
              ]}
            >
              {slot.queueCount} en file
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const SLOT_WIDTH = 100;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  slotCard: {
    width: SLOT_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  slotCardSelected: {
    borderColor: colors.green,
    backgroundColor: colors.greenLight,
  },
  slotCardDisabled: {
    backgroundColor: colors.bg,
    opacity: 0.6,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainerSelected: {
    backgroundColor: colors.green,
  },
  asapText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  timeText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: spacing.xs,
  },
  textSelected: {
    color: colors.greenDark,
  },
  textDisabled: {
    color: colors.textMuted,
  },
  queueText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  queueTextSelected: {
    color: colors.greenDark,
  },
});
