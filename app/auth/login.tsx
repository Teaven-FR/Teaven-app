// Écran Login — connexion par téléphone
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors, fonts, radii, spacing, typography } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    setIsLoading(true);
    // TODO: Appeler useAuth().sendOtp(phone)
    setIsLoading(false);
    router.push({ pathname: '/auth/otp', params: { phone } });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 40 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.brand}>TEAVEN</Text>
        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>
          Entre ton numéro de téléphone pour recevoir un code de vérification
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.prefix}>+33</Text>
          <TextInput
            style={styles.input}
            placeholder="6 12 34 56 78"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={10}
            autoFocus
          />
        </View>

        <Button
          title={isLoading ? 'Envoi...' : 'Recevoir le code'}
          onPress={handleSendOtp}
          disabled={phone.length < 9 || isLoading}
          size="lg"
          style={styles.button}
        />
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
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 6,
    color: colors.green,
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  prefix: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.lg,
  },
  button: {
    width: '100%',
  },
});
