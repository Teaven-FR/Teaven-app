// Écran Onboarding — 5 slides + cercle segmenté + slide finale connexion
import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import type { ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  ChevronRight,
  LogIn,
  UserPlus,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_COUNT = 5;
const CIRCLE_SIZE = 48;
const CIRCLE_R = 20;
const ARC_GAP = 6;
const FINAL_CIRCLE_SIZE = 120;
const FINAL_R = 48;

// Images require() doivent être statiques
const SLIDE_IMAGES = [
  require('../assets/onboarding/menu.png'),
  require('../assets/onboarding/fidelite.png'),
  require('../assets/onboarding/defis.png'),
  require('../assets/onboarding/blog.png'),
  require('../assets/onboarding/wallet.png'),
];

interface SlideData {
  id: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string];
  imageIndex: number;
}

const slides: SlideData[] = [
  {
    id: '1',
    title: 'Commandez en direct,\nsans intermédiaire',
    subtitle: 'Composez votre commande, personnalisez vos formules, et recevez une notification quand c\u2019est prêt.',
    gradient: ['#E8F0EA', '#D4E5D7'],
    imageIndex: 0,
  },
  {
    id: '2',
    title: 'Gagnez des points\nà chaque commande',
    subtitle: 'Votre fidélité est récompensée. Accumulez des points, montez en niveau, débloquez des récompenses exclusives.',
    gradient: ['#EDE8D8', '#E4DFC8'],
    imageIndex: 1,
  },
  {
    id: '3',
    title: 'Relevez des défis,\ngagnez encore plus',
    subtitle: 'Chaque semaine, de nouveaux défis pour booster vos points et débloquer des surprises.',
    gradient: ['#D8E5D2', '#C8DCCA'],
    imageIndex: 2,
  },
  {
    id: '4',
    title: 'Nourrissez aussi\nvotre esprit',
    subtitle: 'Atmosphère, notre espace de lectures positives. Bien-être, nutrition, inspirations.',
    gradient: ['#E8EDDF', '#DDE5D4'],
    imageIndex: 3,
  },
  {
    id: '5',
    title: 'Rechargez, économisez,\nsimplifiez',
    subtitle: 'Créditez votre porte-monnaie Teaven, payez en un geste, profitez de bonus à la recharge.',
    gradient: ['#F5EFDF', '#EDE5D0'],
    imageIndex: 4,
  },
];

// ─── Cercle segmenté SVG ──────────────────────────────────────────────────────

function segmentedArc(cx: number, cy: number, r: number, segments: number, filled: number) {
  const totalGap = segments * ARC_GAP;
  const arcAngle = (360 - totalGap) / segments;
  const paths: Array<{ d: string; active: boolean }> = [];

  for (let i = 0; i < segments; i++) {
    const startAngle = -90 + i * (arcAngle + ARC_GAP);
    const endAngle = startAngle + arcAngle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = arcAngle > 180 ? 1 : 0;
    paths.push({
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      active: i < filled,
    });
  }
  return paths;
}

function OnboardingCircle({ filled, size, r, color = '#75967F' }: { filled: number; size: number; r: number; color?: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const arcs = segmentedArc(cx, cy, r, SLIDE_COUNT, filled);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => (
        <Path
          key={i}
          d={arc.d}
          stroke={arc.active ? color : 'rgba(117,150,127,0.18)'}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const finalAnim = useRef(new Animated.Value(0)).current;

  const handleCreateAccount = async () => {
    await completeOnboarding();
    router.replace('/auth/register');
  };

  const handleLogin = async () => {
    await completeOnboarding();
    router.replace('/auth/login');
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/auth/login');
  };

  const handleNext = () => {
    if (activeIndex < SLIDE_COUNT - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      setShowFinal(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(finalAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 120,
        useNativeDriver: true,
      }).start();
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

  const renderSlide = useCallback(({ item }: { item: SlideData }) => {
    return (
      <View style={styles.slide}>
        <LinearGradient
          colors={item.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.slideGradient}
        >
          {/* Cadre device avec capture d'écran */}
          <View style={styles.deviceFrame}>
            <View style={styles.deviceNotch} />
            <Image
              source={SLIDE_IMAGES[item.imageIndex]}
              style={styles.deviceScreen}
              contentFit="cover"
              transition={300}
            />
          </View>
        </LinearGradient>

        {/* Texte en dessous */}
        <View style={styles.slideText}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  }, []);

  // ─── Slide finale : connexion ─────────────────────────────────────────────

  if (showFinal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Animated.View style={[styles.finalContent, {
          opacity: finalAnim,
          transform: [{
            translateY: finalAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
          }],
        }]}>
          {/* Cercle complet */}
          <View style={styles.finalCircleWrap}>
            <OnboardingCircle filled={SLIDE_COUNT} size={FINAL_CIRCLE_SIZE} r={FINAL_R} />
          </View>

          <Text style={styles.finalTitle}>Votre première parenthèse{'\n'}vous attend.</Text>
          <Text style={styles.finalSubtitle}>
            Connectez-vous pour profiter de l'expérience Teaven{'\n'}au maximum : fidélité, défis, récompenses.
          </Text>

          {/* Bouton principal : créer un compte */}
          <Pressable onPress={handleCreateAccount} style={styles.finalPrimaryBtn}>
            <LinearGradient
              colors={['#75967F', '#5B7A65']}
              style={styles.finalPrimaryGradient}
            >
              <UserPlus size={18} color="#FFFFFF" strokeWidth={1.8} />
              <Text style={styles.finalPrimaryText}>Créer mon compte</Text>
            </LinearGradient>
          </Pressable>

          {/* Bouton secondaire : se connecter */}
          <Pressable onPress={handleLogin} style={styles.finalSecondaryBtn}>
            <LogIn size={16} color={colors.green} strokeWidth={1.8} />
            <Text style={styles.finalSecondaryText}>J'ai déjà un compte fidélité</Text>
          </Pressable>
        </Animated.View>

        {/* Branding */}
        <View style={[styles.finalFooter, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <Image source={require('../assets/Petit logo Teaven.png')} style={styles.brandLogoSmall} contentFit="contain" />
          <Text style={styles.brandTagline}>Votre parenthèse de bien-être au quotidien</Text>
        </View>
      </View>
    );
  }

  // ─── Slides ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header : brand + passer */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Image source={require('../assets/Petit logo Teaven.png')} style={styles.brandLogo} contentFit="contain" />
        <Pressable onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>Passer</Text>
        </Pressable>
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
        style={styles.flatList}
      />

      {/* Contrôles bas */}
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
        {/* Cercle de progression centré */}
        <OnboardingCircle filled={activeIndex + 1} size={CIRCLE_SIZE} r={CIRCLE_R} />

        {/* Bouton suivant */}
        <Pressable onPress={handleNext} style={styles.nextBtn}>
          <LinearGradient colors={['#75967F', '#5B7A65']} style={styles.nextBtnGradient}>
            <Text style={styles.nextBtnText}>
              {activeIndex === SLIDE_COUNT - 1 ? 'C\u2019est parti' : 'Suivant'}
            </Text>
            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },
  brandLogo: {
    width: 120,
    height: 36,
  },
  brand: {
    fontFamily: fonts.thin,
    fontSize: 22,
    letterSpacing: 5,
    color: colors.text,
    textTransform: 'uppercase',
  },
  skipText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textMuted,
  },

  // Slides
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  slideGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    borderRadius: 24,
  },
  deviceFrame: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_WIDTH * 0.55 * 1.95,
    backgroundColor: '#1A1A1A',
    borderRadius: 28,
    padding: 6,
    overflow: 'hidden',
    // Ombre portée
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  deviceNotch: {
    width: 80,
    height: 22,
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    alignSelf: 'center',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  deviceScreen: {
    flex: 1,
    borderRadius: 22,
  },
  slideText: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
    gap: 12,
  },
  slideTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: colors.text,
  },
  slideSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  // Controls
  controls: {
    paddingHorizontal: spacing.xl,
    gap: 20,
    alignItems: 'center',
  },
  nextBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  nextBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },

  // Final slide
  finalContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  finalCircleWrap: {
    marginBottom: 32,
  },
  finalTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
    color: colors.text,
    marginBottom: 12,
  },
  finalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 40,
  },
  finalPrimaryBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  finalPrimaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  finalPrimaryText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  finalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  finalSecondaryText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.green,
  },
  finalFooter: {
    alignItems: 'center',
    gap: 4,
  },
  brandLogoSmall: {
    width: 80,
    height: 24,
    opacity: 0.4,
  },
  brandSmall: {
    fontFamily: fonts.thin,
    fontSize: 16,
    letterSpacing: 5,
    color: colors.textMuted,
  },
  brandTagline: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(0,0,0,0.2)',
  },
});
