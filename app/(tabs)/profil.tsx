// Écran Profil — fidélité, wallet, paramètres
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Settings, HelpCircle, LogOut } from 'lucide-react-native';
import { LoyaltyCard } from '@/components/features/LoyaltyCard';
import { WalletCard } from '@/components/features/WalletCard';
import { ListItem } from '@/components/ui/ListItem';
import { mockUser } from '@/constants/mockData';
import { colors, spacing, typography } from '@/constants/theme';

export default function ProfilScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Mon Profil</Text>

      {/* Carte fidélité */}
      <View style={styles.section}>
        <LoyaltyCard
          name={mockUser.name}
          points={mockUser.loyaltyPoints}
          level={mockUser.loyaltyLevel}
        />
      </View>

      {/* Porte-monnaie */}
      <View style={styles.section}>
        <WalletCard balance={mockUser.walletBalance} />
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <ListItem
          icon={<ClipboardList size={20} color={colors.green} strokeWidth={1.6} />}
          title="Mes commandes"
          subtitle="Historique et suivi"
          onPress={() => {
            // TODO: Naviguer vers historique
          }}
        />
        <View style={styles.separator} />
        <ListItem
          icon={<Settings size={20} color={colors.green} strokeWidth={1.6} />}
          title="Paramètres"
          subtitle="Notifications, préférences"
          onPress={() => {
            // TODO: Naviguer vers paramètres
          }}
        />
        <View style={styles.separator} />
        <ListItem
          icon={<HelpCircle size={20} color={colors.green} strokeWidth={1.6} />}
          title="Aide"
          subtitle="FAQ et contact"
          onPress={() => {
            // TODO: Naviguer vers aide
          }}
        />
        <View style={styles.separator} />
        <ListItem
          icon={<LogOut size={20} color={colors.error} strokeWidth={1.6} />}
          title="Déconnexion"
          onPress={() => {
            // TODO: Déconnexion
          }}
          showChevron={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 100,
  },
  title: {
    ...typography.h1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  menu: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
});
