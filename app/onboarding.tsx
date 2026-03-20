// Écran Onboarding — 3 slides + splash finale avec CTA
import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import type { NativeSyntheticEvent, NativeScrollEvent, ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Leaf, Coffee, Heart } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/constants/theme';

const ONBOARDING_KEY = '@teaven/onboarding_completed';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: typeof Leaf;
  title: string;
  subtitle: string;
  image: string;
  gradient: [string, string];
}

const slides: Slide[] = [
  {
    id: '1',
    icon: Leaf,
    title: 'Nourrir votre corps',
    subtitle: 'Des bowls, salades et plats healthy préparés chaque jour avec des ingrédients frais et locaux.',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=1200&fit=crop',
    gradient: ['#2C4A32', '#4A6B50'],
  },
  {
    id: '2',
    icon: Coffee,
    title: 'Savourer l\'instant',
    subtitle: 'Thés d\'exception, matcha, smoothies et pâtisseries maison pour sublimer votre pause.',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&h=1200&fit=crop',
    gradient: ['#3A5A40', '#5A7B60'],
  },
  {
    id: '3',
    icon: Heart,
    title: 'Partager le bien-être',
    subtitle: 'Un programme fidélité généreux, Click & Collect simple, et une communauté bienveillante.',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=1200&fit=crop',
    gradient: ['#4A6B50', '#6B8F71'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleStart = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      handleStart();
    }
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const isLast = activeIndex === slides.length - 1;

  const renderSlide = useCallback(({ item }: { item: Slide }) => {
    const Icon = item.icon;
    return (
      <View style={styles.slide}>
        {/* Image de fond */}
        <Image
          source={{ uri: item.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={600}
        />
        <LinearGradient
          colors={['rgba(42,42,42,0.15)', 'rgba(42,42,42,0.75)']}
          locations={[0.2, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Contenu du slide */}
        <View style={[styles.slideContent, { paddingBottom: Math.max(insets.bottom, 32) + 80 }]}>
          <View style={[styles.iconCircle, { backgroundColor: item.gradient[0] }]}>
            <Icon size={28} color="#FFFFFF" strokeWidth={1.5} />
          </View>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  }, [insets.bottom]);

  return (
    <View style={styles.container}>
      {/* Logo en haut */}
      <View style={[styles.brandContainer, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.brand}>TEAVEN</Text>
        <Text style={styles.tagline}>Nourrir · Savourer · Partager</Text>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        style={StyleSheet.absoluteFill}
      />

      {/* Logo overlay (au-dessus des slides) */}
      <View style={[styles.brandOverlay, { paddingTop: insets.top + 20 }]} pointerEvents="none">
        <Text style={styles.brand}>TEAVEN</Text>
        <Text style={styles.tagline}>Nourrir · Savourer · Partager</Text>
      </View>

      {/* Contrôles en bas */}
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 32) }]}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Bouton principal */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F5F5F0']}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {isLast ? 'Commencer' : 'Suivant'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Lien skip / login */}
        {!isLast ? (
          <Pressable onPress={handleStart} style={styles.skipButton}>
            <Text style={styles.skipLink}>Passer</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleStart} style={styles.skipButton}>
            <Text style={styles.skipLink}>
              Déjà un compte ?{' '}
              <Text style={styles.skipLinkBold}>Se connecter</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.greenDark,
  },

  // Brand
  brandContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  brandOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
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

  // Slide
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'flex-end',
  },
  slideContent: {
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  slideTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
  },
  slideSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },

  // Controls
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  button: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    shadowOpacity: 0.08,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#3A5A40',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  skipLink: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  skipLinkBold: {
    fontFamily: fonts.bold,
    color: 'rgba(255,255,255,0.85)',
    textDecorationLine: 'underline',
  },
});
