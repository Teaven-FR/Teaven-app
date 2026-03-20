/**
 * HappyHourBanner — Bandeau compact avec compte à rebours happy hour
 * N'affiche rien si l'heure actuelle est hors de la plage définie
 */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Zap } from 'lucide-react-native';
import { colors, fonts, spacing, radii } from '@/constants/theme';

interface HappyHourBannerProps {
  startHour: number;
  endHour: number;
  discount: string;
}

/** Calcule le temps restant en minutes */
function getMinutesRemaining(endHour: number): number {
  const now = new Date();
  const end = new Date();
  end.setHours(endHour, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
}

/** Formate le temps restant en heures et minutes */
function formatRemaining(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `Encore ${h}h ${m.toString().padStart(2, '0')}min`;
  return `Encore ${m}min`;
}

/** Vérifie si l'heure courante est dans la plage */
function isWithinHours(startHour: number, endHour: number): boolean {
  const currentHour = new Date().getHours();
  return currentHour >= startHour && currentHour < endHour;
}

export default function HappyHourBanner({ startHour, endHour, discount }: HappyHourBannerProps) {
  const [remaining, setRemaining] = useState(() => getMinutesRemaining(endHour));
  const [active, setActive] = useState(() => isWithinHours(startHour, endHour));

  /** Mise à jour chaque minute */
  useEffect(() => {
    const interval = setInterval(() => {
      const nowActive = isWithinHours(startHour, endHour);
      setActive(nowActive);
      if (nowActive) {
        setRemaining(getMinutesRemaining(endHour));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [startHour, endHour]);

  // Ne rien afficher si hors happy hour
  if (!active) return null;

  return (
    <LinearGradient
      colors={[colors.gold, colors.orange]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.banner}
    >
      <View style={styles.left}>
        <Zap size={18} color="#FFFFFF" strokeWidth={1.3} />
        <Text style={styles.mainText}>Happy Hour {discount} sur les boissons</Text>
      </View>
      <View style={styles.timerContainer}>
        <Clock size={12} color="rgba(255,255,255,0.8)" strokeWidth={1.3} />
        <Text style={styles.timerText}>{formatRemaining(remaining)}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 60,
    borderRadius: radii.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  mainText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.tag,
  },
  timerText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#FFFFFF',
  },
});
