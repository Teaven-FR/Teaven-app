// Écran OTP — vérification du code SMS
import { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';

const CODE_LENGTH = 6;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) return;
    setIsLoading(true);
    // TODO: Appeler useAuth().verifyOtp(phone, code)
    setIsLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 40 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Vérification</Text>
        <Text style={styles.subtitle}>
          Code envoyé au {phone}
        </Text>

        {/* Champ code caché + affichage visuel */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus
        />

        <View style={styles.codeContainer}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[styles.codeBox, code[i] ? styles.codeBoxFilled : null]}
              onTouchEnd={() => inputRef.current?.focus()}
            >
              <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </View>

        <Button
          title={isLoading ? 'Vérification...' : 'Valider'}
          onPress={handleVerify}
          disabled={code.length !== CODE_LENGTH || isLoading}
          size="lg"
          style={styles.button}
        />

        <Text style={styles.resend}>Renvoyer le code</Text>
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
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
    alignSelf: 'flex-start',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  codeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxFilled: {
    borderColor: colors.green,
  },
  codeDigit: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: colors.text,
  },
  button: {
    width: '100%',
  },
  resend: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.green,
    marginTop: spacing.xl,
  },
});
