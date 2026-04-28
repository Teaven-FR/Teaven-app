// Onboarding Teaven — 3 slides sensorielles + finale spectaculaire.
// Voix de marque : Warm Organic Minimalism, vert Teaven dominant.
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import type { ViewToken } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { ChevronRight, LogIn, UserPlus } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { colors, fonts, spacing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_COUNT = 3;

// ─── Palette Teaven étendue (greens propres à l'onboarding) ────────────────
const T = {
  bg: '#F0F0E5',
  section: '#EBE8DF',
  text: '#1C1C1A',
  textMuted: '#787870',
  textSoft: '#A0A096',
  green: '#75967F',
  greenDeep: '#5B7A65',
  greenDark: '#2D5A3D',
  greenMid: '#9FBCA6',
  greenSoft: '#C8D9CD',
  greenTint: '#DCE6DC',
  matcha: '#7DA878',
  terracotta: '#C4845C',
} as const;

// ─── Cercle segmenté SVG ──────────────────────────────────────────────────
const ARC_GAP = 8;

function buildArcs(size: number, r: number, segments: number, filled: number) {
  const cx = size / 2;
  const cy = size / 2;
  const arcAngle = (360 - ARC_GAP * segments) / segments;
  const paths: Array<{ d: string; active: boolean }> = [];
  for (let i = 0; i < segments; i++) {
    const startAngle = -90 + i * (arcAngle + ARC_GAP);
    const endAngle = startAngle + arcAngle;
    const sRad = (startAngle * Math.PI) / 180;
    const eRad = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(sRad);
    const y1 = cy + r * Math.sin(sRad);
    const x2 = cx + r * Math.cos(eRad);
    const y2 = cy + r * Math.sin(eRad);
    const large = arcAngle > 180 ? 1 : 0;
    paths.push({
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      active: i < filled,
    });
  }
  return paths;
}

function SegmentedRing({
  filled,
  size,
  r,
  stroke = 3,
}: {
  filled: number;
  size: number;
  r: number;
  stroke?: number;
}) {
  const arcs = buildArcs(size, r, SLIDE_COUNT, filled);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => (
        <Path
          key={i}
          d={arc.d}
          stroke={arc.active ? T.green : 'rgba(117,150,127,0.18)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

// Version pour la finale — 5 segments qui s'allument en cascade
function FinaleRing({ size, r, stroke }: { size: number; r: number; stroke: number }) {
  const arcs = buildArcs(size, r, 5, 5);
  const segs = useRef(arcs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      120,
      segs.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [segs]);

  const AnimatedPath = Animated.createAnimatedComponent(Path);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => (
        <AnimatedPath
          key={i}
          d={arc.d}
          stroke={T.green}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          opacity={segs[i]}
        />
      ))}
    </Svg>
  );
}

// ─── Ken Burns wrapper ────────────────────────────────────────────────────
function KenBurnsView({ children, style }: { children: React.ReactNode; style?: any }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 14000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 14000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ scale }, { translateX }, { translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Slide compositions (formes abstraites Teaven) ────────────────────────
function SlideOneImage() {
  return (
    <KenBurnsView>
      <LinearGradient
        colors={[T.greenTint, T.greenSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Halo vert en haut-droite */}
      <View style={styles.s1Arc} />
      {/* Ruban vertical (derrière la boîte) */}
      <View style={styles.s1RibbonV} />
      {/* Boîte terracotta */}
      <View style={styles.s1Box} />
      {/* Ruban horizontal (devant la boîte) */}
      <View style={styles.s1RibbonH} />
      {/* Feuilles */}
      <View style={[styles.leaf, styles.s1Leaf1]} />
      <View style={[styles.leaf, styles.s1Leaf2]} />
      <View style={[styles.leaf, styles.s1Leaf3]} />
    </KenBurnsView>
  );
}

function SlideTwoImage() {
  return (
    <KenBurnsView>
      <LinearGradient
        colors={[T.greenSoft, T.greenTint]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Halo vert bas-gauche */}
      <View style={styles.s2Arc} />
      {/* Leaf accent */}
      <View style={[styles.leaf, styles.s2Leaf]} />
      {/* Avocado top-right */}
      <View style={styles.s2Avocado}>
        <View style={styles.s2AvocadoPit} />
      </View>
      {/* Pastry bottom-left */}
      <View style={styles.s2Pastry} />
      {/* Cup white */}
      <View style={styles.s2Cup} />
      {/* Matcha avec radial */}
      <LinearGradient
        colors={[T.matcha, T.greenDark]}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 0.7, y: 0.7 }}
        style={styles.s2Matcha}
      />
      {/* Foam hint */}
      <View style={styles.s2Foam} />
    </KenBurnsView>
  );
}

function SlideThreeImage() {
  return (
    <KenBurnsView>
      <LinearGradient
        colors={[T.greenSoft, T.greenMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Rings concentriques */}
      <View style={[styles.s3Ring, styles.s3R1]} />
      <View style={[styles.s3Ring, styles.s3R2]} />
      <View style={[styles.s3Ring, styles.s3R3]} />
      <View style={[styles.s3Ring, styles.s3R4]} />
      <View style={[styles.s3Ring, styles.s3R5]} />
      {/* Plus signs */}
      <Plus style={styles.s3P1} />
      <Plus style={styles.s3P2} />
      <Plus style={styles.s3P3} />
      <Plus style={styles.s3P4} />
    </KenBurnsView>
  );
}

function Plus({ style }: { style: any }) {
  return (
    <View style={[styles.plusWrap, style]}>
      <View style={styles.plusV} />
      <View style={styles.plusH} />
    </View>
  );
}

// ─── Slide unitaire ───────────────────────────────────────────────────────
interface SlideData {
  id: string;
  title: string;
  subtitle: string;
  Composition: React.ComponentType;
}

const slides: SlideData[] = [
  {
    id: '1',
    title: 'Une nouvelle app.\nUne expérience complète.',
    subtitle: "Livré chez vous ou prêt à récupérer. Teaven, comme vous l'aimez.",
    Composition: SlideOneImage,
  },
  {
    id: '2',
    title: 'Tout Teaven\ndans votre poche.',
    subtitle:
      'Brunch, avocado, matcha, cappuccino — retrouvez vos produits préférés.',
    Composition: SlideTwoImage,
  },
  {
    id: '3',
    title: "Comme d'habitude,\non prend soin de vous.",
    subtitle: 'Points, défis, bonus — une nouvelle façon de vivre Teaven.',
    Composition: SlideThreeImage,
  },
];

function SlideView({ slide, isActive }: { slide: SlideData; isActive: boolean }) {
  const titleAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const subAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    if (isActive) {
      titleAnim.setValue(0);
      subAnim.setValue(0);
      Animated.stagger(150, [
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 600,
          delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(subAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive, titleAnim, subAnim]);

  const titleStyle = {
    opacity: titleAnim,
    transform: [
      {
        translateY: titleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };
  const subStyle = {
    opacity: subAnim,
    transform: [
      {
        translateY: subAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  const { Composition } = slide;

  return (
    <View style={styles.slide}>
      <View style={styles.imageZone}>
        <Composition />
      </View>
      <View style={styles.textBlock}>
        <Animated.Text style={[styles.slideTitle, titleStyle]}>
          {slide.title}
        </Animated.Text>
        <Animated.Text style={[styles.slideSubtitle, subStyle]}>
          {slide.subtitle}
        </Animated.Text>
      </View>
    </View>
  );
}

// ─── Finale ───────────────────────────────────────────────────────────────
function Finale({
  onCreateAccount,
  onLogin,
  insetsBottom,
}: {
  onCreateAccount: () => void;
  onLogin: () => void;
  insetsBottom: number;
}) {
  const ringAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const breathAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const linkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Ring : scale + rotate in
    Animated.timing(ringAnim, {
      toValue: 1,
      duration: 900,
      delay: 200,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start();

    // Logo fade-up puis breathe en loop
    Animated.timing(logoAnim, {
      toValue: 1,
      duration: 700,
      delay: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });

    // Tagline, title, CTAs en stagger
    Animated.timing(taglineAnim, {
      toValue: 1,
      duration: 600,
      delay: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(titleAnim, {
      toValue: 1,
      duration: 700,
      delay: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(ctaAnim, {
      toValue: 1,
      duration: 700,
      delay: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(linkAnim, {
      toValue: 1,
      duration: 600,
      delay: 1300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const ringStyle = {
    opacity: ringAnim,
    transform: [
      { scale: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
      {
        rotate: ringAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-120deg', '0deg'],
        }),
      },
    ],
  };
  const logoStyle = {
    opacity: logoAnim,
    transform: [
      { translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      {
        scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.028] }),
      },
    ],
  };
  const fadeUpStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
    ],
  });

  return (
    <View style={styles.finale}>
      <LinearGradient
        colors={[T.bg, '#E8E5D8']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.finaleContent}>
        {/* Ring */}
        <Animated.View style={[styles.finaleRingWrap, ringStyle]}>
          <FinaleRing size={180} r={76} stroke={6} />
        </Animated.View>

        {/* Logo */}
        <Animated.View style={[styles.finaleLogoWrap, logoStyle]}>
          <Image
            source={require('../assets/Petit logo Teaven.png')}
            style={styles.finaleLogo}
            contentFit="contain"
          />
        </Animated.View>

        <Animated.Text style={[styles.finaleTagline, fadeUpStyle(taglineAnim)]}>
          UNE PARENTHÈSE DE BIEN-ÊTRE AU QUOTIDIEN
        </Animated.Text>

        <Animated.Text style={[styles.finaleTitle, fadeUpStyle(titleAnim)]}>
          Votre parenthèse{'\n'}commence ici.
        </Animated.Text>
      </View>

      <View
        style={[styles.finaleCtas, { paddingBottom: Math.max(insetsBottom, 20) + 12 }]}
      >
        <Animated.View style={fadeUpStyle(ctaAnim)}>
          <Pressable onPress={onCreateAccount} style={styles.primaryBtn}>
            <LinearGradient
              colors={[T.green, T.greenDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGradient}
            >
              <UserPlus size={18} color="#FFFFFF" strokeWidth={1.8} />
              <Text style={styles.primaryText}>Créer mon compte</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View style={fadeUpStyle(linkAnim)}>
          <Pressable onPress={onLogin} style={styles.secondaryBtn}>
            <LogIn size={16} color={T.green} strokeWidth={1.8} />
            <Text style={styles.secondaryText}>J'ai déjà une carte fidélité</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < SLIDE_COUNT - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      setShowFinal(true);
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

  const renderSlide = useCallback(
    ({ item, index }: { item: SlideData; index: number }) => (
      <SlideView slide={item} isActive={index === activeIndex} />
    ),
    [activeIndex],
  );

  if (showFinal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Finale
          onCreateAccount={handleCreateAccount}
          onLogin={handleLogin}
          insetsBottom={insets.bottom}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Image
          source={require('../assets/Petit logo Teaven.png')}
          style={styles.brandLogo}
          contentFit="contain"
        />
        <Pressable onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>Plus tard</Text>
        </Pressable>
      </View>

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

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
        <LinearGradient
          colors={['rgba(240,240,229,0)', 'rgba(240,240,229,0.85)', T.bg]}
          locations={[0, 0.35, 0.7]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <SegmentedRing filled={activeIndex + 1} size={48} r={20} stroke={3} />
        <Pressable onPress={handleNext} style={styles.nextBtn}>
          <LinearGradient
            colors={[T.green, T.greenDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextGradient}
          >
            <Text style={styles.nextText}>
              {activeIndex === SLIDE_COUNT - 1 ? "C'est parti" : 'Suivant'}
            </Text>
            <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const IMG_H = 380;
const BOX_W = 180;
const BOX_H = 220;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl + 4,
    zIndex: 10,
  },
  brandLogo: {
    width: 110,
    height: 32,
  },
  skipText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: T.textMuted,
  },

  // Slide
  flatList: { flex: 1 },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingTop: 8,
  },
  imageZone: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    height: IMG_H,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: T.section,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 6,
  },
  textBlock: {
    paddingHorizontal: spacing.xl + 4,
    paddingTop: spacing.xxl + 4,
    height: 220,
    gap: 12,
  },
  slideTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: T.text,
  },
  slideSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: T.textMuted,
  },

  // Controls
  controls: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: 18,
    alignItems: 'center',
  },
  nextBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  nextText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },

  // Compositions — Slide 1
  s1Arc: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: T.green,
    opacity: 0.28,
    top: -120,
    right: -120,
  },
  s1Box: {
    position: 'absolute',
    width: BOX_W,
    height: BOX_H,
    left: '50%',
    top: '50%',
    marginLeft: -BOX_W / 2,
    marginTop: -BOX_H / 2,
    backgroundColor: T.terracotta,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
  s1RibbonH: {
    position: 'absolute',
    width: 200,
    height: 12,
    left: '50%',
    top: '50%',
    marginLeft: -100,
    marginTop: -6,
    backgroundColor: T.greenDark,
  },
  s1RibbonV: {
    position: 'absolute',
    width: 12,
    height: 240,
    left: '50%',
    top: '50%',
    marginLeft: -6,
    marginTop: -120,
    backgroundColor: T.greenDark,
  },
  leaf: {
    position: 'absolute',
  },
  s1Leaf1: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.green,
    top: '12%',
    right: '10%',
    transform: [{ rotate: '30deg' }],
  },
  s1Leaf2: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.greenDark,
    top: '22%',
    right: '22%',
    transform: [{ rotate: '-20deg' }],
  },
  s1Leaf3: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: T.matcha,
    bottom: '14%',
    left: '12%',
    transform: [{ rotate: '60deg' }],
  },

  // Compositions — Slide 2
  s2Arc: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: T.green,
    opacity: 0.22,
    bottom: -80,
    left: -80,
  },
  s2Leaf: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: T.greenDark,
    top: '14%',
    left: '16%',
    transform: [{ rotate: '35deg' }],
  },
  s2Cup: {
    position: 'absolute',
    width: 190,
    height: 190,
    left: '50%',
    top: '52%',
    marginLeft: -95,
    marginTop: -95,
    backgroundColor: '#FFFFFF',
    borderRadius: 95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
  },
  s2Matcha: {
    position: 'absolute',
    width: 150,
    height: 150,
    left: '50%',
    top: '52%',
    marginLeft: -75,
    marginTop: -75,
    borderRadius: 75,
  },
  s2Foam: {
    position: 'absolute',
    width: 56,
    height: 32,
    left: '52%',
    top: '49%',
    marginLeft: -28,
    marginTop: -16,
    backgroundColor: '#B8CFA8',
    borderRadius: 28,
    opacity: 0.8,
  },
  s2Avocado: {
    position: 'absolute',
    width: 100,
    height: 62,
    top: '20%',
    right: '12%',
    backgroundColor: T.matcha,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: T.greenDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  s2AvocadoPit: {
    width: 28,
    height: 22,
    backgroundColor: '#4A3525',
    borderRadius: 14,
  },
  s2Pastry: {
    position: 'absolute',
    width: 88,
    height: 88,
    left: '10%',
    bottom: '12%',
    backgroundColor: T.terracotta,
    borderRadius: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },

  // Compositions — Slide 3
  s3Ring: {
    position: 'absolute',
    borderRadius: 999,
    left: '50%',
    top: '50%',
  },
  s3R1: {
    width: 340,
    height: 340,
    marginLeft: -170,
    marginTop: -170,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  s3R2: {
    width: 260,
    height: 260,
    marginLeft: -130,
    marginTop: -130,
    backgroundColor: T.green,
  },
  s3R3: {
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
    backgroundColor: T.greenDeep,
  },
  s3R4: {
    width: 100,
    height: 100,
    marginLeft: -50,
    marginTop: -50,
    backgroundColor: T.greenDark,
  },
  s3R5: {
    width: 38,
    height: 38,
    marginLeft: -19,
    marginTop: -19,
    backgroundColor: T.bg,
  },
  plusWrap: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  plusV: {
    position: 'absolute',
    left: '50%',
    marginLeft: -2,
    top: 0,
    width: 4,
    height: '100%',
    backgroundColor: T.greenDark,
    borderRadius: 2,
  },
  plusH: {
    position: 'absolute',
    top: '50%',
    marginTop: -2,
    left: 0,
    height: 4,
    width: '100%',
    backgroundColor: T.greenDark,
    borderRadius: 2,
  },
  s3P1: { top: '14%', left: '18%' },
  s3P2: { top: '12%', right: '16%' },
  s3P3: { bottom: '18%', right: '12%' },
  s3P4: { bottom: '14%', left: '16%' },

  // Finale
  finale: {
    flex: 1,
  },
  finaleContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xxl,
  },
  finaleRingWrap: {
    marginTop: 40,
  },
  finaleLogoWrap: {
    marginTop: 36,
  },
  finaleLogo: {
    width: 140,
    height: 42,
  },
  finaleTagline: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 3,
    color: T.textMuted,
    marginTop: 14,
    textAlign: 'center',
  },
  finaleTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: T.text,
    textAlign: 'center',
    marginTop: 28,
  },
  finaleCtas: {
    paddingHorizontal: spacing.xxl,
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: T.green,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  primaryText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  secondaryText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: T.green,
  },
});
