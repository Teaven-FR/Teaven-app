// Écran mentions légales — CGU, confidentialité, cookies, contact
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fonts, spacing, typography } from '@/constants/theme';

/** Sections légales avec contenu placeholder réaliste */
const LEGAL_SECTIONS = [
  {
    id: 'cgu',
    title: 'Conditions Générales d\u2019Utilisation',
    paragraphs: [
      'Les présentes Conditions Générales d\u2019Utilisation (ci-après « CGU ») régissent l\u2019accès et l\u2019utilisation de l\u2019application mobile Teaven, éditée par la société Teaven SAS, immatriculée au RCS de Paris sous le numéro 912 345 678, dont le siège social est situé au 42 rue du Thé, 75003 Paris.',
      'En accédant à l\u2019application, l\u2019utilisateur reconnaît avoir pris connaissance des présentes CGU et les accepte sans réserve. L\u2019utilisation de l\u2019application implique l\u2019acceptation pleine et entière de ces conditions. Teaven se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification par notification dans l\u2019application.',
      'L\u2019application permet aux utilisateurs de consulter le catalogue de produits, passer des commandes, gérer leur programme de fidélité et effectuer des paiements. Toute commande passée via l\u2019application constitue un contrat de vente entre l\u2019utilisateur et Teaven, soumis au droit français.',
    ],
  },
  {
    id: 'privacy',
    title: 'Politique de confidentialité',
    paragraphs: [
      'Teaven s\u2019engage à protéger la vie privée de ses utilisateurs conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée. Les données personnelles collectées (nom, numéro de téléphone, adresse email, historique de commandes) sont nécessaires à la gestion du compte, au traitement des commandes et au programme de fidélité.',
      'Les données sont hébergées sur des serveurs sécurisés au sein de l\u2019Union européenne. Elles ne sont en aucun cas transmises à des tiers à des fins commerciales sans le consentement explicite de l\u2019utilisateur. Les données de paiement sont traitées par notre partenaire Square et ne sont jamais stockées sur nos serveurs.',
      'Conformément à la réglementation en vigueur, vous disposez d\u2019un droit d\u2019accès, de rectification, de suppression et de portabilité de vos données personnelles. Pour exercer ces droits, vous pouvez nous contacter à l\u2019adresse privacy@teaven.fr ou via la section « Supprimer mon compte » dans les paramètres de l\u2019application.',
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies et traceurs',
    paragraphs: [
      'L\u2019application Teaven utilise des cookies et traceurs techniques strictement nécessaires à son bon fonctionnement : gestion de la session utilisateur, mémorisation du panier, préférences d\u2019affichage. Ces cookies ne nécessitent pas votre consentement préalable.',
      'Des cookies analytiques peuvent être utilisés pour mesurer l\u2019audience et améliorer l\u2019expérience utilisateur. Ces cookies sont anonymisés et ne permettent pas d\u2019identifier les utilisateurs. Vous pouvez à tout moment modifier vos préférences en matière de cookies dans les paramètres de l\u2019application.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    paragraphs: [
      'Pour toute question relative aux présentes mentions légales, à vos données personnelles ou à l\u2019utilisation de l\u2019application, vous pouvez nous contacter par les moyens suivants :',
      'Teaven SAS\n42 rue du Thé, 75003 Paris\nEmail : contact@teaven.fr\nTéléphone : 01 23 45 67 89\n\nDirecteur de la publication : Johan Martin\nHébergeur : Supabase Inc., 970 Toa Payoh North, Singapour',
      'Conformément à l\u2019article L. 616-1 du Code de la consommation, en cas de litige non résolu, vous pouvez recourir gratuitement au service de médiation de la consommation. Le médiateur compétent est le Centre de Médiation de la Consommation (CMC), joignable à l\u2019adresse mediateur@cmc.fr.',
    ],
  },
] as const;

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ──── Header ──── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={colors.text} strokeWidth={1.3} />
        </Pressable>
        <Text style={styles.headerTitle}>Mentions légales</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ──── Contenu ──── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {LEGAL_SECTIONS.map((section, sectionIndex) => (
          <View
            key={section.id}
            style={[
              styles.section,
              sectionIndex < LEGAL_SECTIONS.length - 1 && styles.sectionWithBorder,
            ]}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph, pIndex) => (
              <Text key={pIndex} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}

        {/* Pied de page */}
        <Text style={styles.footer}>
          Dernière mise à jour : 15 mars 2026
        </Text>
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  headerSpacer: {
    width: 24,
  },

  // Contenu
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },

  // Section
  section: {
    marginBottom: spacing.xxl,
  },
  sectionWithBorder: {
    paddingBottom: spacing.xxl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.lg,
  },
  paragraph: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 24,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Pied de page
  footer: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
});
