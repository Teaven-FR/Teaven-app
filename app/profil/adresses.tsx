// Écran Mes adresses — liste d'adresses avec badge par défaut
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Home, Briefcase, Plus } from 'lucide-react-native';
import { colors, fonts, spacing, shadows } from '@/constants/theme';
import type { Address } from '@/lib/types';

// Données mock
const mockAddresses: Address[] = [
  {
    id: '1',
    label: 'Maison',
    street: '12 rue de la Gare',
    city: 'Franconville',
    postalCode: '95130',
    isDefault: true,
  },
  {
    id: '2',
    label: 'Bureau',
    street: '45 avenue des Champs-Élysées',
    city: 'Paris',
    postalCode: '75008',
    isDefault: false,
  },
];

const ICONS: Record<string, typeof Home> = {
  Maison: Home,
  Bureau: Briefcase,
};

export default function AdressesScreen() {
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
        <Text style={styles.headerTitle}>Mes adresses</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Liste des adresses */}
        {mockAddresses.map((addr) => {
          const Icon = ICONS[addr.label] ?? Home;
          return (
            <View key={addr.id} style={styles.addressCard}>
              <View style={styles.addressIconWrap}>
                <Icon size={18} color={colors.green} strokeWidth={1.8} />
              </View>
              <View style={styles.addressContent}>
                <View style={styles.addressLabelRow}>
                  <Text style={styles.addressLabel}>{addr.label}</Text>
                  {addr.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Par défaut</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressText}>
                  {addr.street}, {addr.postalCode} {addr.city}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Bouton ajouter */}
        <Pressable
          style={styles.addButton}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une adresse"
        >
          <Plus size={18} color={colors.green} strokeWidth={2} />
          <Text style={styles.addButtonText}>Ajouter une adresse</Text>
        </Pressable>

        {/* Note livraison */}
        <Text style={styles.note}>
          La livraison sera disponible prochainement
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
    gap: spacing.md,
  },

  // Address cards
  addressCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: spacing.md,
    ...shadows.subtle,
  },
  addressIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContent: {
    flex: 1,
  },
  addressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  addressLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 50,
  },
  defaultBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.green,
  },
  addressText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Bouton ajouter
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.green,
  },

  // Note
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
