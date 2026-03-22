// Écran paramètres — hub de configuration du compte et préférences
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  CreditCard,
  UtensilsCrossed,
  Bell,
  Info,
  FileText,
  Trash2,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/contexts/ToastContext';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

/** Élément de navigation dans le menu */
interface SettingsNavItem {
  id: string;
  label: string;
  icon: typeof User;
  route: string;
}

/** Sections du menu COMPTE */
const ACCOUNT_ITEMS: SettingsNavItem[] = [
  { id: 'info', label: 'Informations personnelles', icon: User, route: '/profil/informations' },
  { id: 'addresses', label: 'Adresses', icon: MapPin, route: '/profil/adresses' },
  { id: 'payment', label: 'Moyens de paiement', icon: CreditCard, route: '/profil/paiement' },
];

/** Section INFORMATIONS */
const INFO_ITEMS: SettingsNavItem[] = [
  { id: 'legal', label: 'Mentions légales', icon: FileText, route: '/legal' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showToast } = useToast();
  const signOut = useAuthStore((s) => s.signOut);

  // État des toggles de notifications
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifPromos, setNotifPromos] = useState(true);
  const [notifBlog, setNotifBlog] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  /** Déconnexion avec confirmation */
  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          },
        },
      ],
    );
  };

  /** Suppression de compte avec double confirmation */
  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données, points de fidélité et historique de commandes seront définitivement supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Simulation de la suppression
            showToast('Demande de suppression envoyée');
          },
        },
      ],
    );
  };

  /** Rendu d'un élément de navigation */
  const renderNavItem = (item: SettingsNavItem, isLast: boolean) => {
    const Icon = item.icon;
    return (
      <View key={item.id}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push(item.route as `/${string}`)}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <View style={styles.menuItemLeft}>
            <Icon size={18} color={colors.green} strokeWidth={1.3} />
            <Text style={styles.menuItemText}>{item.label}</Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.3} />
        </Pressable>
        {!isLast && <View style={styles.menuSep} />}
      </View>
    );
  };

  /** Rendu d'un toggle de notification */
  const renderToggle = (
    label: string,
    value: boolean,
    onToggle: (val: boolean) => void,
    isLast: boolean,
  ) => (
    <View key={label}>
      <View style={styles.menuItem}>
        <Text style={styles.menuItemText}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.green }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.border}
          accessibilityLabel={`Notifications ${label}`}
          accessibilityRole="switch"
        />
      </View>
      {!isLast && <View style={styles.menuSep} />}
    </View>
  );

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
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ──── COMPTE ──── */}
        <Text style={styles.sectionLabel}>COMPTE</Text>
        <View style={styles.card}>
          {ACCOUNT_ITEMS.map((item, index) =>
            renderNavItem(item, index === ACCOUNT_ITEMS.length - 1),
          )}
        </View>

        {/* ──── PRÉFÉRENCES ──── */}
        <Text style={styles.sectionLabel}>PRÉFÉRENCES</Text>
        <View style={styles.card}>
          {/* Préférences alimentaires */}
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push('/profil/informations')}
            accessibilityRole="button"
            accessibilityLabel="Préférences alimentaires"
          >
            <View style={styles.menuItemLeft}>
              <UtensilsCrossed size={18} color={colors.green} strokeWidth={1.3} />
              <Text style={styles.menuItemText}>Préférences alimentaires</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.3} />
          </Pressable>
          <View style={styles.menuSep} />

          {/* Sous-section notifications */}
          <View style={styles.notifHeader}>
            <Bell size={18} color={colors.green} strokeWidth={1.3} />
            <Text style={styles.notifHeaderText}>Notifications</Text>
          </View>
          <View style={styles.menuSep} />

          {renderToggle('Commandes', notifOrders, setNotifOrders, false)}
          {renderToggle('Promotions', notifPromos, setNotifPromos, false)}
          {renderToggle('Blog', notifBlog, setNotifBlog, false)}
        </View>

        {/* ──── NEWSLETTER ──── */}
        <Text style={styles.sectionLabel}>NEWSLETTER</Text>
        <View style={styles.card}>
          <View style={styles.newsletterBanner}>
            <Text style={styles.newsletterTitle}>Recevez nos inspirations</Text>
            <Text style={styles.newsletterSub}>
              Recettes, conseils bien-être, nouveautés Teaven — et 50 pts offerts à l'inscription.
            </Text>
          </View>
          <View style={styles.menuSep} />
          <View style={styles.menuItem}>
            <Text style={styles.menuItemText}>S'abonner à la newsletter</Text>
            <Switch
              value={newsletter}
              onValueChange={(val) => {
                setNewsletter(val);
                if (val) showToast('Newsletter activée · +50 pts crédités !');
                else showToast('Newsletter désactivée');
              }}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={colors.border}
              accessibilityLabel="S'abonner à la newsletter"
              accessibilityRole="switch"
            />
          </View>
        </View>

        {/* ──── INFORMATIONS ──── */}
        <Text style={styles.sectionLabel}>INFORMATIONS</Text>
        <View style={styles.card}>
          {/* À propos */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Info size={18} color={colors.green} strokeWidth={1.3} />
              <Text style={styles.menuItemText}>À propos</Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
          <View style={styles.menuSep} />

          {INFO_ITEMS.map((item, index) =>
            renderNavItem(item, index === INFO_ITEMS.length - 1),
          )}
        </View>

        {/* ──── DANGER ZONE ──── */}
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.menuItem}
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Supprimer mon compte"
          >
            <View style={styles.menuItemLeft}>
              <Trash2 size={18} color={colors.error} strokeWidth={1.3} />
              <Text style={[styles.menuItemText, styles.dangerText]}>
                Supprimer mon compte
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ──── Bouton déconnexion ──── */}
        <Pressable
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <LogOut size={18} color={colors.error} strokeWidth={1.3} />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>
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
    paddingBottom: 60,
  },

  // Label de section
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.textMuted,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },

  // Carte de section
  card: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.subtle,
  },

  // Élément de menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  menuItemText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  menuSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 50,
  },

  // Newsletter
  newsletterBanner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: 4,
  },
  newsletterTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  newsletterSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Notifications header
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  notifHeaderText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },

  // Version
  versionText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.textMuted,
  },

  // Danger
  dangerText: {
    color: colors.error,
  },

  // Bouton déconnexion
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xxxl,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
    ...shadows.subtle,
  },
  signOutText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.error,
  },
});
