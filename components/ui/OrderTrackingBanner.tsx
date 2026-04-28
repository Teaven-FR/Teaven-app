// Banner suivi de commande — FOND BLANC + accent vert (distinct des défis)
// Position absolute en haut, mais les écrans ajoutent un padding via bannerHeight du context
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Truck, Package, ChevronDown, ChevronUp, MapPin } from 'lucide-react-native';
import { useActiveOrder } from '@/contexts/ActiveOrderContext';
import { useOrderStore } from '@/stores/orderStore';
import { colors, fonts, spacing } from '@/constants/theme';

export function OrderTrackingBanner() {
  const { activeOrder } = useActiveOrder();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentOrder = useOrderStore((s) => s.currentOrder);
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeOrder ? 0 : -120,
      damping: 22, stiffness: 200,
      useNativeDriver: useNative,
    }).start();
  }, [!!activeOrder]);

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: expanded ? 1 : 0,
      damping: 18, stiffness: 180,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  if (!activeOrder) return null;

  const isDelivery = activeOrder.mode === 'delivery';
  const Icon = isDelivery ? Truck : Package;
  const route = isDelivery
    ? `/delivery/${activeOrder.orderId}`
    : `/order/${activeOrder.orderId}`;

  const fmt = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

  const expandHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, currentOrder ? Math.min(currentOrder.items.length * 22 + 80, 180) : 100],
  });

  return (
    <Animated.View
      style={[styles.container, { paddingTop: insets.top + 4, transform: [{ translateY: slideAnim }] }]}
      pointerEvents="box-none"
    >
      {/* Main banner — tap to open tracking */}
      <Pressable
        style={styles.banner}
        onPress={() => router.push(route)}
        accessibilityRole="button"
        accessibilityLabel={`Suivi commande : ${activeOrder.statusLabel}`}
      >
        <View style={styles.iconWrap}>
          <Icon size={14} color={colors.green} strokeWidth={2} />
        </View>

        <View style={styles.content}>
          <Text style={styles.statusLabel} numberOfLines={1}>{activeOrder.statusLabel}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${activeOrder.progressPercent}%` }]} />
          </View>
        </View>

        {activeOrder.eta && (
          <Text style={styles.eta}>{activeOrder.eta}</Text>
        )}

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.expandBtn}
          hitSlop={10}
        >
          {expanded
            ? <ChevronUp size={13} color={colors.textSecondary} strokeWidth={2} />
            : <ChevronDown size={13} color={colors.textSecondary} strokeWidth={2} />
          }
        </Pressable>
      </Pressable>

      {/* Expanded details */}
      <Animated.View style={[styles.expandedWrap, { height: expandHeight, opacity: expandAnim }]}>
        {currentOrder && expanded && (
          <View style={styles.expandedContent}>
            {currentOrder.items.slice(0, 3).map((item, i) => (
              <Text key={i} style={styles.detailItem} numberOfLines={1}>
                {item.quantity}× {item.name}
              </Text>
            ))}
            {currentOrder.items.length > 3 && (
              <Text style={styles.detailMore}>+{currentOrder.items.length - 3} autre{currentOrder.items.length - 3 > 1 ? 's' : ''}</Text>
            )}

            <View style={styles.detailFooter}>
              <Text style={styles.detailTotal}>{fmt(currentOrder.total)}</Text>
              {isDelivery && currentOrder.deliveryAddress && (
                <View style={styles.detailAddress}>
                  <MapPin size={10} color={colors.textMuted} strokeWidth={1.5} />
                  <Text style={styles.detailAddressText} numberOfLines={1}>
                    {currentOrder.deliveryAddress.street}
                  </Text>
                </View>
              )}
            </View>

            <Pressable onPress={() => router.push(route)} style={styles.detailCta}>
              <Text style={styles.detailCtaText}>Voir le suivi complet</Text>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: spacing.md,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(117,150,127,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 4 },
  statusLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
  },
  eta: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 10,
    color: colors.green,
  },
  progressTrack: {
    height: 2.5,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 2.5,
    backgroundColor: colors.green,
    borderRadius: 2,
  },
  expandBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded
  expandedWrap: {
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginTop: -6,
    marginHorizontal: 1,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(117,150,127,0.15)',
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
  detailItem: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    paddingVertical: 1,
  },
  detailMore: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  detailTotal: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 13,
    color: colors.green,
  },
  detailAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
    marginLeft: spacing.md,
  },
  detailAddressText: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
    flex: 1,
  },
  detailCta: {
    backgroundColor: colors.greenLight,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  detailCtaText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.green,
  },
});
