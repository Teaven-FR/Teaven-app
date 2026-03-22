// FAQ / Aide — accordéon animé, fond crème, ton chaleureux Teaven
import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

// Activer LayoutAnimation sur Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ────────────────────────────────────────────────────────────
// Données
// ────────────────────────────────────────────────────────────

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const FAQ_DATA: FaqSection[] = [
  {
    title: 'Commande & Click and Collect',
    items: [
      {
        q: 'Comment passer une commande ?',
        a: 'Choisissez vos articles depuis la carte, ajoutez-les au panier et validez votre commande. Vous recevrez une confirmation avec l\'heure de retrait.',
      },
      {
        q: 'Quels sont les délais de préparation ?',
        a: 'Comptez en moyenne 10 à 15 minutes selon l\'affluence. Vous serez notifié quand votre commande est prête.',
      },
      {
        q: 'Puis-je modifier ou annuler ma commande ?',
        a: 'Vous pouvez annuler dans les 2 minutes suivant la commande. Passé ce délai, contactez directement Teaven.',
      },
      {
        q: 'Comment fonctionne le Click & Collect ?',
        a: 'Commandez depuis l\'app, payez en ligne, et récupérez votre commande directement au comptoir sans attendre.',
      },
    ],
  },
  {
    title: 'Programme fidélité',
    items: [
      {
        q: 'Comment fonctionne le Teaven Club ?',
        a: 'Chaque euro dépensé vous rapporte des points. Cumulez des points pour débloquer des récompenses exclusives : boissons offertes, desserts, réductions...',
      },
      {
        q: 'Comment gagner des points ?',
        a: 'Automatiquement à chaque commande via l\'app. Vos points sont crédités dès la validation de votre paiement.',
      },
      {
        q: 'Mes points expirent-ils ?',
        a: 'Vos points sont valables 12 mois à compter de leur acquisition.',
      },
    ],
  },
  {
    title: 'Paiement',
    items: [
      {
        q: 'Quels moyens de paiement sont acceptés ?',
        a: 'Carte bancaire (Visa, Mastercard), Apple Pay, Google Pay, et votre porte-monnaie Teaven.',
      },
      {
        q: 'Mon paiement est-il sécurisé ?',
        a: 'Oui. Tous les paiements sont traités par Square, certifié PCI-DSS. Vos données bancaires ne sont jamais stockées sur nos serveurs.',
      },
    ],
  },
  {
    title: 'Offrir un moment',
    items: [
      {
        q: 'Comment offrir un moment Teaven ?',
        a: 'Depuis l\'onglet Profil, accédez à \'Offrir un moment\' et choisissez le montant de votre choix. Un code cadeau sera généré et partageable.',
      },
    ],
  },
  {
    title: 'Compte',
    items: [
      {
        q: 'Comment modifier mes informations ?',
        a: 'Dans Profil → Mes informations, vous pouvez modifier votre prénom, email et préférences alimentaires.',
      },
      {
        q: 'Comment supprimer mon compte ?',
        a: 'Contactez-nous à contact@teaven.co avec votre demande. La suppression sera effective sous 30 jours.',
      },
    ],
  },
  {
    title: 'Contact',
    items: [
      {
        q: 'Comment contacter Teaven ?',
        a: 'Par email : contact@teaven.co. Ou directement au salon : Teaven Franconville.',
      },
    ],
  },
];

// ────────────────────────────────────────────────────────────
// Composant accordéon — un seul item
// ────────────────────────────────────────────────────────────

function AccordionItem({ item, isLast }: { item: FaqItem; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const toggle = () => {
    LayoutAnimation.configureNext({
      duration: 240,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
    });

    Animated.timing(rotateAnim, {
      toValue: open ? 0 : 1,
      duration: 240,
      useNativeDriver: true,
    }).start();

    setOpen((prev) => !prev);
  };

  return (
    <View>
      <Pressable
        style={styles.itemHeader}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={item.q}
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.itemQuestion}>{item.q}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown size={16} color={colors.textSecondary} strokeWidth={1.8} />
        </Animated.View>
      </Pressable>

      {open && (
        <View style={styles.itemBody}>
          <Text style={styles.itemAnswer}>{item.a}</Text>
        </View>
      )}

      {!isLast && <View style={styles.itemSep} />}
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Composant section
// ────────────────────────────────────────────────────────────

function FaqSection({ section }: { section: FaqSection }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionCard}>
        {section.items.map((item, i) => (
          <AccordionItem
            key={i}
            item={item}
            isLast={i === section.items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Écran principal
// ────────────────────────────────────────────────────────────

export default function FaqScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ChevronLeft size={20} color={colors.text} strokeWidth={1.8} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Aide & FAQ</Text>
          <Text style={styles.headerSub}>Toutes vos questions, nos réponses</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      {/* Sections FAQ */}
      {FAQ_DATA.map((section, i) => (
        <FaqSection key={i} section={section} />
      ))}

      {/* Footer contact */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Vous n'avez pas trouvé votre réponse ?
        </Text>
        <Text style={styles.footerEmail}>contact@teaven.co</Text>
      </View>
    </ScrollView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    ...shadows.card,
  },

  // Item accordéon
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  itemQuestion: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  itemBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 15,
  },
  itemAnswer: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  itemSep: {
    height: 0.5,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footerEmail: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
  },
});
