// Centre de notifications — liste complète avec état lu/non-lu
import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ShoppingBag,
  Tag,
  Star,
  Info,
} from 'lucide-react-native';
import {
  mockNotifications,
  type AppNotification,
} from '@/constants/mockNotifications';
import { colors, fonts, spacing, radii, shadows } from '@/constants/theme';

/** Type de notification */
type NotificationType = AppNotification['type'];

/** Couleur de l'icône selon le type de notification */
const TYPE_COLORS: Record<NotificationType, string> = {
  order: colors.green,
  promo: colors.gold,
  loyalty: colors.violet,
  system: colors.textSecondary,
};

/** Icône selon le type de notification */
const TYPE_ICONS: Record<NotificationType, typeof ShoppingBag> = {
  order: ShoppingBag,
  promo: Tag,
  loyalty: Star,
  system: Info,
};

/** Formatage du timestamp en temps relatif */
function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'À l\'instant';
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return 'Hier';
  if (diffD < 7) return `Il y a ${diffD} jours`;
  return `Il y a ${Math.floor(diffD / 7)} sem.`;
}

/** Rendu d'une notification individuelle */
function NotificationItem({ item }: { item: AppNotification }) {
  const Icon = TYPE_ICONS[item.type];
  const iconColor = TYPE_COLORS[item.type];
  const iconBg = `${iconColor}15`; // 15 = ~8% opacité en hex

  return (
    <View style={[styles.notifCard, !item.read && styles.notifCardUnread]}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon size={18} color={iconColor} strokeWidth={1.3} />
      </View>

      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notifDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.notifTime}>{formatRelativeTime(new Date(item.timestamp))}</Text>
      </View>
    </View>
  );
}

/** État vide — aucune notification */
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Info size={32} color={colors.textMuted} strokeWidth={1.3} />
      </View>
      <Text style={styles.emptyTitle}>Aucune notification</Text>
      <Text style={styles.emptyText}>
        Vous recevrez ici vos alertes de commandes, promotions et actualités Teaven.
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => <NotificationItem item={item} />,
    [],
  );

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

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

        <Text style={styles.headerTitle}>Notifications</Text>

        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* ──── Liste des notifications ──── */}
      <FlatList
        data={mockNotifications}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          mockNotifications.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={EmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  badge: {
    backgroundColor: colors.green,
    borderRadius: radii.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },

  // Liste
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  listContentEmpty: {
    flex: 1,
  },
  separator: {
    height: spacing.sm,
  },

  // Carte notification
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.subtle,
  },
  notifCardUnread: {
    backgroundColor: '#FAFAF2',
    borderColor: colors.green + '30',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notifTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  notifDescription: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  notifTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },

  // État vide
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
