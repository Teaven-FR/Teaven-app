// Écran Onboarding — splash avec photo, logo, CTA
// S'affiche une seule fois, flag persisté dans AsyncStorage
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, spacing } from '@/constants/theme';

const ONBOARDING_KEY = '@teaven/onboarding_completed';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleStart = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      {/* Image de fond */}
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=1200&fit=crop' }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={600}
      />
      <LinearGradient
        colors={['transparent', 'rgba(42,42,42,0.7)']}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Contenu */}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 32) }]}>
        {/* Logo en haut */}
        <View style={[styles.brandContainer, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.brand}>TEAVEN</Text>
          <Text style={styles.tagline}>Nourrir · Savourer · Partager</Text>
        </View>

        {/* CTA en bas */}
        <View style={styles.cta}>
          <Text style={styles.welcome}>
            Votre parenthèse bien-être,{'\n'}à emporter.
          </Text>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }]}
            accessibilityLabel="Commencer l'expérience Teaven"
          >
            <Text style={styles.buttonText}>Commencer</Text>
          </Pressable>
          <Pressable onPress={handleStart}>
            <Text style={styles.loginLink}>
              Déjà un compte ? Se connecter
            </Text>
          </Pressable>
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
  },
  brandContainer: {
    alignItems: 'center',
  },
  brand: {
    fontFamily: fonts.thin,
    fontSize: 42,
    letterSpacing: 8,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 12,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.65)',
  },
  cta: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  welcome: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#4A6B50',
  },
  loginLink: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
