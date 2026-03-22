// Écran Login — connexion par téléphone avec design premium Teaven
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, spacing } from '@/constants/theme';

/** Formate un numéro de téléphone avec des espaces tous les 2 chiffres */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 2) {
    parts.push(digits.slice(i, i + 2));
  }
  return parts.join(' ');
}

/** Extrait les chiffres uniquement */
function cleanPhone(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signInWithPhone = useAuthStore((s) => s.signInWithPhone);
  const enterGuestMode = useAuthStore((s) => s.enterGuestMode);

  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = cleanPhone(phone);
  const isValid = digits.length >= 9;

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const handleSendOtp = async () => {
    if (!isValid) return;
    setIsLoading(true);
    setError(null);

    const fullPhone = `+33${digits.startsWith('0') ? digits.slice(1) : digits}`;
    const result = await signInWithPhone(fullPhone);

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push({ pathname: '/auth/otp', params: { phone: fullPhone } });
  };

  const handleGuestMode = () => {
    enterGuestMode();
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 60 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <Text style={styles.brand}>TEAVEN</Text>

        {/* Titre */}
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>
          Entrez votre numéro de téléphone
        </Text>

        {/* Input téléphone */}
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
            maxLength={14} // "6 12 34 56 78" = 14 chars
            autoFocus
            accessibilityLabel="Numéro de téléphone"
          />
        </View>

        {/* Erreur */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Bouton Recevoir le code */}
        <Pressable
          onPress={handleSendOtp}
          disabled={!isValid || isLoading}
          style={({ pressed }) => [
            styles.ctaButton,
            (!isValid || isLoading) && styles.ctaDisabled,
            pressed && isValid && styles.ctaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Recevoir le code"
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.ctaText}>Recevoir le code</Text>
          )}
        </Pressable>

        {/* Lien continuer sans compte */}
        <Pressable onPress={handleGuestMode} style={styles.guestLink}>
          <Text style={styles.guestText}>Continuer sans compte</Text>
        </Pressable>
      </View>

      {/* Mention légale */}
      <View style={[styles.legalWrap, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.legalText}>
          En continuant, vous acceptez nos CGU et notre politique de
          confidentialité
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  brand: {
    fontFamily: fonts.thin,
    fontSize: 32,
    letterSpacing: 6,
    color: colors.green,
    textAlign: 'center',
    marginBottom: 48,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Input téléphone
  phoneRow: {
    flexDirection: 'row',
    height: 48,
    marginBottom: spacing.xl,
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

  // CTA
  ctaButton: {
    height: 48,
    backgroundColor: colors.green,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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

  // Lien invité
  guestLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  guestText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },

  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // Mention légale
  legalWrap: {
    paddingHorizontal: spacing.xxl,
  },
  legalText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
