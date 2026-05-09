// Carte "Complète ton profil" — affichée sur le tab profil quand des infos manquent.
// Lit le user store (name/email) + profiles (birthday) + AsyncStorage (adresses)
// pour calculer le % de complétion. Cliquer un champ manquant ouvre l'écran d'édition.
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronRight, User as UserIcon, Mail, MapPin, Cake, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, spacing, shadows, radii } from '@/constants/theme';

type FieldKey = 'name' | 'email' | 'address' | 'birthday';

type Field = {
  key: FieldKey;
  label: string;
  reward: string;
  icon: typeof UserIcon;
  filled: boolean;
  route: '/profil/informations' | '/profil/adresses';
};

export function ProfileCompletionCard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [birthday, setBirthday] = useState<string | null>(null);
  const [hasAddress, setHasAddress] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    const [{ data }, addrRaw] = await Promise.all([
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.user) return { data: null };
        return supabase.from('profiles').select('birthday').eq('id', session.user.id).single();
      }),
      AsyncStorage.getItem('@teaven/addresses'),
    ]);
    setBirthday((data as { birthday?: string | null } | null)?.birthday ?? null);
    try {
      const arr = addrRaw ? JSON.parse(addrRaw) : [];
      setHasAddress(Array.isArray(arr) && arr.length > 0);
    } catch {
      setHasAddress(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!isAuthenticated || !user) return null;

  const trimmedName = (user.fullName ?? '').trim();
  const hasName = trimmedName.length > 0 && trimmedName !== 'Utilisateur';
  const hasEmail = !!user.email && user.email.trim().length > 0;

  const fields: Field[] = [
    { key: 'name', label: 'Ajoute ton nom', reward: '+50 pts', icon: UserIcon, filled: hasName, route: '/profil/informations' },
    { key: 'email', label: 'Ajoute ton email', reward: '+50 pts', icon: Mail, filled: hasEmail, route: '/profil/informations' },
    { key: 'address', label: 'Ajoute ton adresse', reward: '+50 pts', icon: MapPin, filled: hasAddress, route: '/profil/adresses' },
    { key: 'birthday', label: 'Ajoute ta date de naissance', reward: '+100 pts', icon: Cake, filled: !!birthday, route: '/profil/informations' },
  ];

  const filledCount = fields.filter((f) => f.filled).length;
  const completion = Math.round((filledCount / fields.length) * 100);

  if (completion === 100) return null;

  const missing = fields.filter((f) => !f.filled);
  const totalReward = missing.reduce((acc, f) => acc + (f.key === 'birthday' ? 100 : 50), 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Sparkles size={16} color={colors.green} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.title}>Complète ton profil</Text>
            <Text style={styles.subtitle}>
              Jusqu'à {totalReward} pts à gagner
            </Text>
          </View>
        </View>
        <Text style={styles.percent}>{completion}%</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${completion}%` as `${number}%` }]} />
      </View>

      <View style={styles.fieldsList}>
        {missing.map((f) => {
          const Icon = f.icon;
          return (
            <Pressable
              key={f.key}
              style={({ pressed }) => [styles.fieldRow, pressed && styles.fieldRowPressed]}
              onPress={() => router.push(f.route)}
              accessibilityRole="button"
              accessibilityLabel={f.label}
            >
              <View style={styles.fieldIconWrap}>
                <Icon size={14} color={colors.green} strokeWidth={1.8} />
              </View>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldReward}>{f.reward}</Text>
              <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.subtle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  percent: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.green,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(117,150,127,0.15)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  fieldsList: {
    gap: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  fieldRowPressed: {
    backgroundColor: '#F5F5F0',
  },
  fieldIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  fieldReward: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
});
