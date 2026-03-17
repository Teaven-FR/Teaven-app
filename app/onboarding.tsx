// Écran Onboarding — splash avec photo, logo, CTA
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Image de fond */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=1200&fit=crop' }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={600}
      />
      <View style={styles.overlay} />

      {/* Contenu */}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 32) }]}>
        <View style={styles.brandContainer}>
          <Text style={styles.brand}>TEAVEN</Text>
          <Text style={styles.tagline}>Nourrir · Savourer · S'évader</Text>
        </View>

        <View style={styles.cta}>
          <Text style={styles.welcome}>
            Bienvenue dans ton espace de bien-être
          </Text>
          <Button
            title="Commencer"
            onPress={() => router.replace('/(tabs)')}
            size="lg"
            style={styles.button}
          />
          <Text style={styles.loginLink}>
            Déjà un compte ? Se connecter
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.greenDark,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42,42,42,0.45)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: 80,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brand: {
    fontFamily: fonts.bold,
    fontSize: 42,
    letterSpacing: 12,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontFamily: fonts.thin,
    fontSize: 14,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)',
  },
  cta: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  welcome: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
  },
  button: {
    width: '100%',
  },
  loginLink: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
