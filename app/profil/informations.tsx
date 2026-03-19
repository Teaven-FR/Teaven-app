// Écran Informations personnelles — formulaire profil utilisateur
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing } from '@/constants/theme';

const DIETARY_OPTIONS = ['Vegan', 'Végétarien', 'Sans gluten', 'Sans lactose', 'Bio'];

export default function InformationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useUser();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email ?? '');
  const [dietary, setDietary] = useState<string[]>(user.dietaryPreferences);
  const [isSaving, setIsSaving] = useState(false);

  const toggleDietary = (pref: string) => {
    setDietary((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    await updateProfile({
      fullName,
      email: email || undefined,
      dietaryPreferences: dietary,
    });
    setIsSaving(false);
    showToast('Profil mis à jour');
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

        {/* Bouton enregistrer */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { opacity: 0.9 },
            isSaving && { opacity: 0.6 },
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

  // Bouton sauvegarder
  saveButton: {
    height: 48,
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
