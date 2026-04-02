// Page dédiée à un niveau des Parenthèses — concept, avantages, intention
import { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Check, Lock, Sparkles, Star, ChevronRight } from 'lucide-react-native';
import { useUser } from '@/hooks/useUser';
import { fonts, spacing, shadows } from '@/constants/theme';

// ─── Contenu éditorial de chaque niveau ───────────────────────────────────────

interface LevelData {
  tagline: string;
  manifeste: string;
  benefits: Array<{ label: string; detail: string }>;
  gradient: readonly [string, string, string];
  text: string;
  subtext: string;
  accent: string;
  trackBg: string;
  minPts: number;
}

export const LEVEL_DATA: Record<string, LevelData> = {
  'Première Parenthèse': {
    tagline: 'Le commencement de tout.',
    manifeste:
      `Vous venez d'ouvrir votre première parenthèse. C'est un geste simple, mais il dit quelque chose : vous avez choisi Teaven. Nous apprenons à vous connaître. Chaque commande est une découverte partagée, chaque visite un début de quelque chose.`,
    benefits: [
      { label: 'Toute la carte', detail: `Accès libre à l'ensemble de nos plats, boissons et formules.` },
      { label: '10 points par euro', detail: 'Points crédités automatiquement à chaque commande.' },
      { label: 'Newsletter Atmosphère', detail: 'Recettes, bien-être et actualités Teaven chaque semaine.' },
      { label: 'Offre de bienvenue', detail: '100 points offerts + code BIENVENUE -15%.' },
    ],
    gradient: ['#F7F4ED', '#EDE8D8', '#E4DFC8'],
    text: '#2C3A2E',
    subtext: '#738478',
    accent: '#75967F',
    trackBg: 'rgba(117,150,127,0.15)',
    minPts: 0,
  },
  'Habitude': {
    tagline: 'La régularité, célébrée.',
    manifeste:
      `Vous revenez. Ce n'est pas anodin — revenir est le premier signe de confiance. L'habitude n'est pas une routine, c'est une élection. Vous choisissez Teaven encore et encore. Nous célébrons ça avec des attentions qui n'existent que pour vous.`,
    benefits: [
      { label: 'Boisson offerte', detail: 'Un verre offert au passage du palier.' },
      { label: 'Offres surprises', detail: 'Des attentions mensuelles réservées à votre niveau.' },
      { label: 'Défis bonus', detail: 'Accès aux défis hebdomadaires pour multiplier vos points.' },
      { label: 'Surprise anniversaire', detail: 'Un cadeau Teaven le mois de votre anniversaire.' },
    ],
    gradient: ['#E8EDDF', '#D8E5D2', '#C8DCCA'],
    text: '#1E3022',
    subtext: '#4A6B50',
    accent: '#5B7A65',
    trackBg: 'rgba(117,150,127,0.18)',
    minPts: 2000,
  },
  'Rituel': {
    tagline: 'Teaven fait partie de vous.',
    manifeste:
      `L'habitude est devenue rituel. Ce mot dit tout : ce n'est plus une visite, c'est une intention. Vous avez intégré Teaven dans votre équilibre — le matin, la pause déjeuner, le goûter. Nous sommes fiers de cette place. Nous la méritons chaque jour.`,
    benefits: [
      { label: 'Plat offert', detail: 'Un plat au choix offert au passage du palier.' },
      { label: 'Dessert automatique', detail: 'Un dessert offert toutes les 5 commandes.' },
      { label: 'Multiplicateur ×1.5', detail: '15 points par euro au lieu de 10.' },
      { label: 'Menu de saison en avance', detail: 'Accès au nouveau menu 48h avant tout le monde.' },
    ],
    gradient: ['#C2D8C6', '#A8C8AE', '#8EB898'],
    text: '#1A2E1E',
    subtext: '#2C4A32',
    accent: '#2C4A32',
    trackBg: 'rgba(255,255,255,0.3)',
    minPts: 5000,
  },
  'Sérénité': {
    tagline: 'Le soin que vous méritez.',
    manifeste:
      `Vous avez traversé les étapes avec une constance que nous admirons. La Sérénité, ce n'est pas un mot choisi par hasard. À ce niveau, nous prenons soin de vous différemment — avec des attentions pensées sur mesure, une relation qui va au-delà de la commande.`,
    benefits: [
      { label: 'Brunch offert', detail: 'Un brunch complet offert au passage du palier.' },
      { label: '-5% permanent', detail: 'Réduction automatique sur toutes vos commandes.' },
      { label: 'Multiplicateur ×1.7', detail: '17 points par euro dépensé.' },
      { label: 'Parrainage boosté', detail: '10\u20AC wallet offerts à chaque parrainage au lieu de 5\u20AC.' },
    ],
    gradient: ['#75967F', '#5B7A65', '#4A6B50'],
    text: '#FFFFFF',
    subtext: 'rgba(255,255,255,0.75)',
    accent: '#FFFFFF',
    trackBg: 'rgba(255,255,255,0.2)',
    minPts: 10000,
  },
  'Essentia': {
    tagline: `L'essentiel, pour les essentiels.`,
    manifeste:
      `Il n'y a pas de mots simples pour ce niveau. Essentia, c'est l'expérience Teaven dans sa forme la plus épurée. Vous faites partie d'un cercle très restreint — celui des personnes qui ont fait confiance, encore et encore, jusqu'à l'essentiel. Merci.`,
    benefits: [
      { label: 'Brunch offert / trimestre', detail: 'Un brunch complet offert chaque trimestre, automatiquement.' },
      { label: 'Multiplicateur ×2', detail: '20 points par euro — le maximum.' },
      { label: 'Parrainage premium', detail: '15\u20AC wallet offerts à chaque parrainage.' },
      { label: 'Contact prioritaire', detail: 'Un canal dédié pour vos retours et demandes.' },
    ],
    gradient: ['#3A5A3E', '#2C4A32', '#1A2E1E'],
    text: '#FFFFFF',
    subtext: 'rgba(255,255,255,0.7)',
    accent: 'rgba(255,255,255,0.9)',
    trackBg: 'rgba(255,255,255,0.12)',
    minPts: 20000,
  },
};

const LEVEL_ORDER = ['Première Parenthèse', 'Habitude', 'Rituel', 'Sérénité', 'Essentia'];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function NiveauScreen() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loyalty } = useUser();

  const data = LEVEL_DATA[level ?? ''];

  // Animations d'entrée
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!data) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Niveau introuvable</Text>
      </View>
    );
  }

  const isCurrentLevel = loyalty.level === level;
  const isUnlocked = loyalty.points >= data.minPts;
  const isLocked = !isUnlocked;

  const currentIndex = LEVEL_ORDER.indexOf(level ?? '');
  const nextLevelName = LEVEL_ORDER[currentIndex + 1];
  const nextLevelData = nextLevelName ? LEVEL_DATA[nextLevelName] : null;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 60 }}
    >
      {/* ── Hero gradient ── */}
      <LinearGradient
        colors={data.gradient as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 12 }]}
      >
        {/* Décors */}
        <View style={[styles.decor, { top: -40, right: -40, width: 160, height: 160 }]} />
        <View style={[styles.decor, { bottom: -30, left: -30, width: 100, height: 100, opacity: 0.03 }]} />

        {/* Nav */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: isLocked ? 'rgba(0,0,0,0.1)' : `${data.accent}40` }]}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ArrowLeft size={18} color={data.text} strokeWidth={1.8} />
          </Pressable>

          {isCurrentLevel && (
            <View style={[styles.currentBadge, { backgroundColor: `${data.accent}25`, borderColor: `${data.accent}50` }]}>
              <Star size={10} color={data.accent} fill={data.accent} strokeWidth={0} />
              <Text style={[styles.currentBadgeText, { color: data.accent }]}>Votre niveau actuel</Text>
            </View>
          )}
          {isLocked && (
            <View style={[styles.currentBadge, { backgroundColor: 'rgba(0,0,0,0.06)', borderColor: 'rgba(0,0,0,0.1)' }]}>
              <Lock size={10} color={data.text} strokeWidth={2} />
              <Text style={[styles.currentBadgeText, { color: data.text, opacity: 0.6 }]}>Verrouillé</Text>
            </View>
          )}
        </View>

        {/* Contenu hero */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={[styles.heroMin, { color: data.subtext }]}>
            {data.minPts === 0 ? 'Dès 0 point' : `Dès ${data.minPts.toLocaleString('fr-FR')} points`}
          </Text>
          <Text style={[styles.heroTitle, { color: data.text }]}>{level}</Text>
          <Text style={[styles.heroTagline, { color: data.subtext }]}>{data.tagline}</Text>

          {/* Barre de progression si niveau actuel */}
          {isCurrentLevel && (
            <View style={styles.heroProgress}>
              <View style={[styles.heroProgressTrack, { backgroundColor: data.trackBg }]}>
                <View
                  style={[
                    styles.heroProgressFill,
                    { width: `${loyalty.progressPercent}%` as `${number}%`, backgroundColor: data.accent },
                  ]}
                />
              </View>
              <Text style={[styles.heroProgressLabel, { color: data.subtext }]}>
                {loyalty.points.toLocaleString('fr-FR')} pts
              </Text>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      {/* ── Manifeste ── */}
      <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
        <Text style={styles.sectionLabel}>L'ESPRIT DE CE NIVEAU</Text>
        <Text style={styles.manifeste}>{data.manifeste}</Text>
      </Animated.View>

      {/* ── Avantages ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>CE QUI VOUS EST OFFERT</Text>
        <View style={styles.benefitsList}>
          {data.benefits.map((b, i) => (
            <View key={i} style={[styles.benefitRow, isLocked && styles.benefitLocked]}>
              <View style={[styles.benefitCheck, { backgroundColor: isLocked ? '#F0F0EA' : '#EDF5EF' }]}>
                {isLocked
                  ? <Lock size={12} color="#ABABAB" strokeWidth={2} />
                  : <Check size={12} color="#4A7A52" strokeWidth={2.5} />
                }
              </View>
              <View style={styles.benefitContent}>
                <Text style={[styles.benefitLabel, isLocked && { color: '#ABABAB' }]}>{b.label}</Text>
                <Text style={[styles.benefitDetail, isLocked && { color: '#C8C8C8' }]}>{b.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ── Niveau suivant ── */}
      {nextLevelData && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NIVEAU SUIVANT</Text>
          <Pressable
            onPress={() => router.push(`/niveau/${encodeURIComponent(nextLevelName)}`)}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={nextLevelData.gradient as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextLevelCard}
            >
              <View style={styles.nextLevelContent}>
                <View>
                  <Text style={[styles.nextLevelPts, { color: nextLevelData.subtext }]}>
                    dès {nextLevelData.minPts.toLocaleString('fr-FR')} pts
                  </Text>
                  <Text style={[styles.nextLevelName, { color: nextLevelData.text }]}>{nextLevelName}</Text>
                  <Text style={[styles.nextLevelTagline, { color: nextLevelData.subtext }]}>{nextLevelData.tagline}</Text>
                </View>
                <ChevronRight size={18} color={nextLevelData.text} strokeWidth={1.8} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {!nextLevelData && (
        <View style={styles.section}>
          <View style={styles.essentiaBanner}>
            <Sparkles size={18} color="#C4A96A" strokeWidth={1.5} />
            <Text style={styles.essentiaBannerText}>Vous êtes au sommet du cercle Teaven.</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: fonts.regular, fontSize: 15, color: '#737373' },

  // Hero
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  decor: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  currentBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  heroMin: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 32,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroTagline: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  heroProgress: {
    gap: 6,
  },
  heroProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 5,
    borderRadius: 3,
  },
  heroProgressLabel: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.xl,
    paddingTop: 28,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2.5,
    color: '#75967F',
    marginBottom: 14,
  },
  manifeste: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    color: '#3A3A3A',
  },

  // Benefits
  benefitsList: { gap: 10 },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EBEBE5',
    ...shadows.subtle,
  },
  benefitLocked: { opacity: 0.55 },
  benefitCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  benefitContent: { flex: 1 },
  benefitLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#2C3A2E',
    marginBottom: 3,
  },
  benefitDetail: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: '#737373',
    lineHeight: 17,
  },

  // Niveau suivant
  nextLevelCard: {
    borderRadius: 16,
    padding: 18,
    overflow: 'hidden',
    ...shadows.card,
  },
  nextLevelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextLevelPts: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  nextLevelName: {
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: 3,
  },
  nextLevelTagline: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },

  // Essentia banner
  essentiaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FBF7EE',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8D8B0',
  },
  essentiaBannerText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#8A7040',
    flex: 1,
  },
});
