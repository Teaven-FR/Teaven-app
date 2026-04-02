// Écran CGU et Politique de confidentialité — texte scrollable
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, fonts, spacing } from '@/constants/theme';

export default function CguScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Mentions légales</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Conditions Générales d'Utilisation</Text>
        <Text style={styles.body}>
          Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent
          l'utilisation de l'application mobile Teaven et de ses services associés.
          {'\n\n'}
          En accédant à l'application Teaven, vous acceptez sans réserve les présentes CGU.
          Teaven se réserve le droit de modifier les présentes CGU à tout moment.
          {'\n\n'}
          L'application Teaven permet aux utilisateurs de consulter le catalogue de produits,
          de passer des commandes en Click & Collect, de gérer leur programme de fidélité
          et leur porte-monnaie numérique.
          {'\n\n'}
          L'utilisateur s'engage à fournir des informations exactes lors de son inscription
          et à ne pas utiliser l'application à des fins illicites ou non conformes aux
          présentes CGU.
        </Text>

        <Text style={styles.sectionTitle}>Politique de confidentialité</Text>
        <Text style={styles.body}>
          Teaven s'engage à protéger la vie privée de ses utilisateurs conformément
          au Règlement Général sur la Protection des Données (RGPD).
          {'\n\n'}
          Les données collectées (numéro de téléphone, prénom, préférences alimentaires,
          historique de commandes) sont utilisées exclusivement pour le fonctionnement
          de l'application et l'amélioration de l'expérience utilisateur.
          {'\n\n'}
          Vos données ne sont jamais vendues à des tiers. Les paiements sont traités
          de manière sécurisée par Square et Teaven n'a jamais accès à vos informations
          bancaires complètes.
          {'\n\n'}
          Vous disposez d'un droit d'accès, de rectification et de suppression de vos
          données personnelles. Pour exercer ces droits, contactez-nous à l'adresse
          ci-dessous.
        </Text>

        <Text style={styles.sectionTitle}>Gestion des cookies</Text>
        <Text style={styles.body}>
          L'application Teaven utilise des technologies de stockage local (AsyncStorage)
          pour assurer le bon fonctionnement de l'application : session utilisateur,
          panier, préférences.
          {'\n\n'}
          Aucun cookie de tracking publicitaire n'est utilisé. Les données stockées
          localement sont essentielles au fonctionnement de l'application et ne sont
          pas partagées avec des tiers.
        </Text>

        <Text style={styles.sectionTitle}>Contact</Text>
        <Text style={styles.body}>
          Pour toute question relative aux présentes CGU ou à notre politique de
          confidentialité, vous pouvez nous contacter :
          {'\n\n'}
          contact@teaven.fr
          {'\n\n'}
          Teaven SAS{'\n'}
          12 Place de la Gare{'\n'}
          95130 Franconville{'\n'}
          France
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 24,
    color: '#4A4A4A',
  },
});
