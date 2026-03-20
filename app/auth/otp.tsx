// Écran OTP — vérification du code SMS avec 6 cases, timer et auto-vérif
import { useState, useRef, useEffect, useCallback } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, spacing } from '@/constants/theme';

const CODE_LENGTH = 6;
const RESEND_DELAY = 60; // secondes

/** Masque partiellement un numéro de téléphone */
function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  const prefix = phone.slice(0, 6);
  const suffix = phone.slice(-2);
  return `${prefix} XX XX ${suffix}`;
}

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const signInWithPhone = useAuthStore((s) => s.signInWithPhone);

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_DELAY);
  const inputRef = useRef<TextInput>(null);

  // Countdown pour le renvoi
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Vérification automatique quand les 6 chiffres sont saisis
  const handleVerify = useCallback(async (otpCode: string) => {
    if (otpCode.length !== CODE_LENGTH || isLoading) return;
    setIsLoading(true);

    const success = await verifyOtp(phone ?? '', otpCode);
    setIsLoading(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      setCode('');
    }
  }, [phone, isLoading, verifyOtp, router]);

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCode(cleaned);
    if (cleaned.length === CODE_LENGTH) {
      handleVerify(cleaned);
    }
  };

  // Renvoyer le code
  const handleResend = async () => {
    if (timer > 0 || !phone) return;
    setTimer(RESEND_DELAY);
    await signInWithPhone(phone);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Bouton retour */}
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <ChevronLeft size={24} color={colors.text} strokeWidth={2} />
      </Pressable>

      <View style={styles.content}>
        {/* Titre */}
        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Code envoyé au {maskPhone(phone ?? '')}
        </Text>

        {/* Input caché pour le clavier */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={handleCodeChange}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus
          textContentType="oneTimeCode"
        />

        {/* 6 cases visuelles */}
        <Pressable
          style={styles.codeRow}
          onPress={() => inputRef.current?.focus()}
          accessibilityLabel="Saisir le code de vérification"
        >
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const isFocused = code.length === i;
            const isFilled = code[i] !== undefined;
            return (
              <View
                key={i}
                style={[
                  styles.codeBox,
                  isFilled && styles.codeBoxFilled,
                  isFocused && styles.codeBoxFocused,
                ]}
              >
                <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </Pressable>

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.green} size="small" />
            <Text style={styles.loadingText}>Vérification en cours...</Text>
          </View>
        )}

        {/* Timer / Renvoyer */}
        {!isLoading && (
          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                Renvoyer le code dans {timer}s
              </Text>
            ) : (
              <Pressable onPress={handleResend} accessibilityRole="button">
                <Text style={styles.resendText}>Renvoyer le code</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
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
    marginLeft: spacing.lg,
    marginTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingTop: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: 40,
  },

  // Input caché
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },

  // Cases OTP
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 32,
  },
  codeBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: colors.green,
  },
  codeBoxFocused: {
    borderColor: colors.green,
    borderWidth: 2,
  },
  codeDigit: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Resend
  resendRow: {
    alignItems: 'center',
  },
  timerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  resendText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
  },
});
