// Écran Informations personnelles — formulaire profil utilisateur
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Cake, Sparkles } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { useAuthStore } from '@/stores/authStore';
import { callEdgeFunction } from '@/lib/square';
import { colors, fonts, spacing } from '@/constants/theme';

const DIETARY_OPTIONS = ['Vegan', 'Végétarien', 'Sans gluten', 'Sans lactose', 'Bio'];
const BIRTHDAY_BONUS_POINTS = 100;

/** Convertit "DD/MM/YYYY" → "YYYY-MM-DD" si valide. */
function parseFrenchDate(value: string): string | null {
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (year < 1900 || year > new Date().getFullYear()) return null;
  // Vérifie que la date est réelle (ex : 31/02 → invalide)
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Convertit "YYYY-MM-DD" → "DD/MM/YYYY". */
function formatIsoToFrench(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

/** Masque la saisie en DD/MM/YYYY au fil de la frappe. */
function maskBirthday(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length >= 3) parts.push(digits.slice(2, 4));
  if (digits.length >= 5) parts.push(digits.slice(4, 8));
  return parts.join('/');
}

export default function InformationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useUser();
  const { showToast } = useToast();
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email ?? '');
  const [dietary, setDietary] = useState<string[]>(user.dietaryPreferences);
  const [birthday, setBirthday] = useState('');
  const [serverBirthday, setServerBirthday] = useState<string | null>(null);
  const [bonusAlreadyClaimed, setBonusAlreadyClaimed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger l'anniversaire depuis Square au montage (si lié)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current || !user.phone) return;
    loadedRef.current = true;
    callEdgeFunction<{
      success: boolean;
      customer: { birthday?: string | null } | null;
    }>('fetch-customer', { phone: user.phone }).then((res) => {
      const square = res.data?.customer?.birthday ?? null;
      if (square) {
        setServerBirthday(square);
        setBirthday(formatIsoToFrench(square));
        setBonusAlreadyClaimed(true);
      }
    });
  }, [user.phone]);

  const toggleDietary = (pref: string) => {
    setDietary((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  };

  const isoBirthday = useMemo(() => parseFrenchDate(birthday), [birthday]);
  const birthdayChanged = isoBirthday !== null && isoBirthday !== serverBirthday;
  const birthdayInvalid = birthday.length === 10 && isoBirthday === null;
  const willEarnBonus = birthdayChanged && !bonusAlreadyClaimed;

  const handleSave = async () => {
    if (birthdayInvalid) {
      setError('Date d\'anniversaire invalide. Format JJ/MM/AAAA.');
      return;
    }
    setError(null);
    setIsSaving(true);

    // Mise à jour locale immédiate
    await updateProfile({
      fullName,
      email: email || undefined,
      dietaryPreferences: dietary,
    });

    // Si l'anniversaire a changé → enregistrer côté Square + (éventuel) bonus
    let bonusAwarded = 0;
    if (birthdayChanged && isoBirthday) {
      const result = await callEdgeFunction<{
        success: boolean;
        bonusAwarded: number;
        alreadyClaimed: boolean;
      }>('claim-birthday-bonus', { birthday: isoBirthday });

      if (result.error) {
        setIsSaving(false);
        setError(result.error);
        return;
      }
      bonusAwarded = result.data?.bonusAwarded ?? 0;
      setServerBirthday(isoBirthday);
      setBonusAlreadyClaimed(true);

      if (bonusAwarded > 0) {
        const current = useAuthStore.getState().user;
        if (current) {
          setUser({
            ...current,
            loyaltyPoints: (current.loyaltyPoints ?? 0) + bonusAwarded,
          });
        }
      }
    }

    setIsSaving(false);
    showToast(
      bonusAwarded > 0
        ? `Anniversaire enregistré ! +${bonusAwarded} points offerts 🎉`
        : 'Profil mis à jour',
    );
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Informations personnelles</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Nom complet"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Votre nom"
        />

        <Input
          label="Téléphone"
          value={user.phone}
          disabled
          placeholder="+33 6 XX XX XX XX"
        />

        <Input
          label="Email (optionnel)"
          value={email}
          onChangeText={setEmail}
          placeholder="votre@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* ──── Anniversaire (carte design system) ──── */}
        <View style={styles.birthdayCardWrap}>
          <LinearGradient
            colors={['#E8F0EA', '#D4E5D7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.birthdayCard}
          >
            <View style={styles.birthdayHeader}>
              <View style={styles.birthdayIconCircle}>
                <Cake size={18} color={colors.green} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.birthdayTitle}>Votre anniversaire</Text>
                <Text style={styles.birthdaySubtitle}>
                  {bonusAlreadyClaimed
                    ? 'Une récompense vous attendra chaque année.'
                    : `+${BIRTHDAY_BONUS_POINTS} points offerts en l'enregistrant.`}
                </Text>
              </View>
            </View>

            <View style={styles.birthdayInputWrap}>
              <TextInput
                style={[
                  styles.birthdayInput,
                  birthdayInvalid && styles.birthdayInputError,
                ]}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={colors.textMuted}
                value={birthday}
                onChangeText={(t) => setBirthday(maskBirthday(t))}
                keyboardType="number-pad"
                maxLength={10}
                accessibilityLabel="Date d'anniversaire"
              />
              {willEarnBonus && (
                <View style={styles.bonusBadge}>
                  <Sparkles size={11} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.bonusBadgeText}>+{BIRTHDAY_BONUS_POINTS} pts</Text>
                </View>
              )}
            </View>

            {birthdayInvalid && (
              <Text style={styles.birthdayError}>Format attendu : JJ/MM/AAAA</Text>
            )}
          </LinearGradient>
        </View>

        {/* Préférences alimentaires */}
        <Text style={styles.dietaryLabel}>Préférences alimentaires</Text>
        <View style={styles.chipsRow}>
          {DIETARY_OPTIONS.map((pref) => {
            const active = dietary.includes(pref);
            return (
              <Pressable
                key={pref}
                onPress={() => toggleDietary(pref)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={pref}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {pref}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Bouton enregistrer */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving || birthdayInvalid}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.9 },
            (isSaving || birthdayInvalid) && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer"
        >
          <Text style={styles.saveText}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },

  // Birthday card
  birthdayCardWrap: {
    marginBottom: spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  birthdayCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  birthdayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  birthdayIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  birthdayTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#2C3A2E',
  },
  birthdaySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#4A6B50',
    marginTop: 2,
    lineHeight: 16,
  },
  birthdayInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  birthdayInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(117,150,127,0.25)',
    paddingHorizontal: 14,
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.text,
    letterSpacing: 0.5,
  },
  birthdayInputError: {
    borderColor: colors.error,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.green,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  bonusBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  birthdayError: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.error,
    marginLeft: 4,
  },

  // Préférences alimentaires
  dietaryLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: '#F5F5F0',
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
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },

  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Bouton sauvegarder
  saveButton: {
    height: 50,
    backgroundColor: colors.green,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
