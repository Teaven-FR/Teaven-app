// Écran Inscription — création de compte par téléphone (OTP) + infos profil.
// Le compte Supabase est créé via signInWithOtp (shouldCreateUser=true par défaut),
// les infos prénom/nom/email sont propagées à l'écran OTP puis écrites dans le profil
// après vérification du code SMS.
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, UserPlus } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, spacing } from '@/constants/theme';

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 2) {
    parts.push(digits.slice(i, i + 2));
  }
  return parts.join(' ');
}

function cleanPhone(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

function isValidEmail(email: string): boolean {
  if (!email) return true; // Optionnel
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signInWithPhone = useAuthStore((s) => s.signInWithPhone);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedCgu, setAcceptedCgu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = cleanPhone(phone);
  const phoneOk = digits.length >= 9;
  const nameOk = firstName.trim().length > 0;
  const emailOk = isValidEmail(email.trim());
  const isValid = phoneOk && nameOk && emailOk && acceptedCgu;

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      if (!nameOk) setError('Votre prénom est requis.');
      else if (!emailOk) setError('Email invalide.');
      else if (!phoneOk) setError('Numéro de téléphone invalide.');
      else if (!acceptedCgu) setError('Veuillez accepter les CGU.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const fullPhone = `+33${digits.startsWith('0') ? digits.slice(1) : digits}`;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const result = await signInWithPhone(fullPhone);

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    router.push({
      pathname: '/auth/otp',
      params: {
        phone: fullPhone,
        fullName,
        email: email.trim(),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>TEAVEN</Text>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          Pour passer commande et profiter de la fidélité Teaven.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Votre prénom"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            textContentType="givenName"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nom (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Votre nom"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            textContentType="familyName"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="vous@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Téléphone</Text>
          <View style={styles.phoneRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>+33</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="6 12 34 56 78"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={handlePhoneChange}
              maxLength={14}
              textContentType="telephoneNumber"
            />
          </View>
        </View>

        <Pressable
          onPress={() => setAcceptedCgu((v) => !v)}
          style={styles.cguRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedCgu }}
        >
          <View style={[styles.checkbox, acceptedCgu && styles.checkboxChecked]}>
            {acceptedCgu && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.cguText}>
            J'accepte les CGU et la politique de confidentialité Teaven.
          </Text>
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={handleSubmit}
          disabled={!isValid || isLoading}
          style={({ pressed }) => [
            styles.ctaButton,
            (!isValid || isLoading) && styles.ctaDisabled,
            pressed && isValid && styles.ctaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Créer mon compte"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <UserPlus size={16} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.ctaText}>Créer mon compte</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace('/auth/login')}
          style={styles.altLink}
          accessibilityRole="button"
        >
          <Text style={styles.altText}>
            Déjà un compte ? <Text style={styles.altBold}>Se connecter</Text>
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
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 8,
    paddingBottom: 40,
  },
  brand: {
    fontFamily: fonts.thin,
    fontSize: 28,
    letterSpacing: 6,
    color: colors.green,
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },

  phoneRow: {
    flexDirection: 'row',
    height: 48,
  },
  prefixBox: {
    width: 60,
    height: 48,
    backgroundColor: '#F5F5F0',
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0,
  },
  prefixText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },

  cguRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fonts.bold,
    lineHeight: 14,
  },
  cguText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.error,
    marginBottom: spacing.sm,
  },

  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    backgroundColor: colors.green,
    borderRadius: 14,
    marginTop: spacing.md,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },

  altLink: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  altText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  altBold: {
    fontFamily: fonts.bold,
    color: colors.green,
  },
});
