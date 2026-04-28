// Écran Suivi de livraison — map + tracking temps réel style premium
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  ArrowLeft,
  Truck,
  MapPin,
  Phone,
  User,
  ExternalLink,
  Check,
  Package,
  ChefHat,
  Navigation,
  Sparkles,
} from 'lucide-react-native';
import { useOrderStore } from '@/stores/orderStore';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';
import { colors, fonts, spacing, shadows } from '@/constants/theme';

interface DeliveryStatus {
  success: boolean;
  status: string;
  courier: { name: string; phone: string; vehicle: string } | null;
  tracking_url: string | null;
  estimated_pickup_at: string | null;
  estimated_dropoff_at: string | null;
  actual_pickup_at: string | null;
  actual_dropoff_at: string | null;
  uber_delivery_id: string | null;
  stub?: boolean;
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Confirmée', shortLabel: 'Confirmée', icon: Check, color: colors.green },
  { key: 'preparing', label: 'En préparation', shortLabel: 'Préparation', icon: ChefHat, color: '#C4A962' },
  { key: 'picked_up', label: 'Récupérée par le livreur', shortLabel: 'Récupérée', icon: Package, color: colors.green },
  { key: 'en_route', label: 'Livreur en route vers vous', shortLabel: 'En route', icon: Navigation, color: '#4A6B50' },
  { key: 'delivered', label: 'Commande livrée !', shortLabel: 'Livrée !', icon: Truck, color: colors.green },
] as const;

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0, payment_confirmed: 0, courier_assigned: 1,
    preparing: 1, picked_up: 2, en_route: 3, delivered: 4,
    dropoff: 3, pickup: 1, pickup_complete: 2,
  };
  return map[status] ?? 0;
}

function formatETA(isoDate: string | null): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const now = new Date();
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);
  if (diffMin <= 0) return 'Imminent';
  if (diffMin < 60) return `~${diffMin} min`;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatETATime(isoDate: string | null): string {
  if (!isoDate) return '--:--';
  return new Date(isoDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Teaven Franconville coordinates
const STORE_COORDS = { latitude: 48.9894, longitude: 2.2294 };

export default function DeliveryTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const order = useOrderStore((s) => s.getOrderById(id ?? ''));
  const useNative = Platform.OS !== 'web';

  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Animations
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  const fetchStatus = useCallback(async () => {
    if (!id) return;
    try {
      const deliveryId = order?.deliveryId;
      const params = deliveryId
        ? `delivery_id=${encodeURIComponent(deliveryId)}`
        : `order_id=${encodeURIComponent(id)}`;

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/uber-direct-get-status?${params}`,
        { headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY } },
      );
      const data = await res.json();
      if (data.success) setDeliveryStatus(data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [id, order?.deliveryId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Entrance animations
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: useNative }),
        Animated.spring(cardSlide, { toValue: 0, damping: 18, stiffness: 160, useNativeDriver: useNative }),
      ]).start();
    }
  }, [loading]);

  // Progress bar animation
  const currentStep = getStepIndex(deliveryStatus?.status ?? 'pending');
  const progressPercent = ((currentStep + 1) / STATUS_STEPS.length) * 100;

  useEffect(() => {
    Animated.spring(progressWidth, {
      toValue: progressPercent,
      damping: 20, stiffness: 120, useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  const isDelivered = deliveryStatus?.status === 'delivered';
  const isCancelled = deliveryStatus?.status === 'cancelled' || deliveryStatus?.status === 'returned';
  const currentStepData = STATUS_STEPS[currentStep] ?? STATUS_STEPS[0];

  // Delivery destination coords (fallback to a point near store)
  const dropoffCoords = order?.deliveryAddress?.lat && order?.deliveryAddress?.lng
    ? { latitude: order.deliveryAddress.lat, longitude: order.deliveryAddress.lng }
    : { latitude: STORE_COORDS.latitude + 0.008, longitude: STORE_COORDS.longitude + 0.005 };

  // Simulated courier position (interpolated between store and dropoff based on step)
  const courierProgress = currentStep >= 3 ? 0.7 : currentStep >= 2 ? 0.3 : 0;
  const courierCoords = {
    latitude: STORE_COORDS.latitude + (dropoffCoords.latitude - STORE_COORDS.latitude) * courierProgress,
    longitude: STORE_COORDS.longitude + (dropoffCoords.longitude - STORE_COORDS.longitude) * courierProgress,
  };

  const animatedWidth = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centered]}>
        <ActivityIndicator size="large" color={colors.green} />
        <Text style={styles.loadingText}>Chargement du suivi…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header transparent overlay */}
      <View style={styles.headerOverlay}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Suivi de livraison</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Map */}
      <Animated.View style={[styles.mapContainer, { opacity: heroOpacity }]}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude: (STORE_COORDS.latitude + dropoffCoords.latitude) / 2,
            longitude: (STORE_COORDS.longitude + dropoffCoords.longitude) / 2,
            latitudeDelta: Math.abs(STORE_COORDS.latitude - dropoffCoords.latitude) * 2.5 + 0.005,
            longitudeDelta: Math.abs(STORE_COORDS.longitude - dropoffCoords.longitude) * 2.5 + 0.005,
          }}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={false}
          rotateEnabled={false}
          customMapStyle={MAP_STYLE}
        >
          {/* Store marker */}
          <Marker coordinate={STORE_COORDS} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerStore}>
              <Sparkles size={12} color="#FFFFFF" strokeWidth={2} />
            </View>
          </Marker>

          {/* Destination marker */}
          <Marker coordinate={dropoffCoords} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.markerDestination}>
              <MapPin size={20} color={colors.green} strokeWidth={2} fill={colors.greenLight} />
            </View>
          </Marker>

          {/* Courier marker (when en route) */}
          {currentStep >= 2 && !isDelivered && (
            <Marker coordinate={courierCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.markerCourier}>
                <Truck size={14} color="#FFFFFF" strokeWidth={2} />
              </View>
            </Marker>
          )}

          {/* Route line */}
          <Polyline
            coordinates={[STORE_COORDS, dropoffCoords]}
            strokeColor={colors.green}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        </MapView>

        {/* ETA overlay on map */}
        {deliveryStatus?.estimated_dropoff_at && !isDelivered && !isCancelled && (
          <View style={styles.etaOverlay}>
            <Text style={styles.etaTime}>{formatETATime(deliveryStatus.estimated_dropoff_at)}</Text>
            <Text style={styles.etaLabel}>arrivée estimée</Text>
          </View>
        )}
      </Animated.View>

      {/* Bottom card with status details */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: cardSlide }] }]}>
        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <View style={[styles.statusBadge, isDelivered && styles.statusBadgeDone, isCancelled && styles.statusBadgeCancelled]}>
              <currentStepData.icon size={12} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>{currentStepData.label}</Text>
              {deliveryStatus?.estimated_dropoff_at && !isDelivered && (
                <Text style={styles.statusETA}>{formatETA(deliveryStatus.estimated_dropoff_at)}</Text>
              )}
            </View>
          </View>

          {/* Horizontal progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: animatedWidth }]} />
          </View>
          <View style={styles.progressLabels}>
            {STATUS_STEPS.map((step, i) => (
              <Text
                key={step.key}
                style={[styles.progressStepLabel, i <= currentStep && styles.progressStepLabelActive]}
              >
                {step.shortLabel}
              </Text>
            ))}
          </View>
        </View>

        {/* Courier info */}
        {deliveryStatus?.courier && (
          <View style={styles.courierCard}>
            <View style={styles.courierRow}>
              <View style={styles.courierAvatar}>
                <User size={18} color={colors.green} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.courierName}>{deliveryStatus.courier.name}</Text>
                {deliveryStatus.courier.vehicle && (
                  <Text style={styles.courierVehicle}>{deliveryStatus.courier.vehicle}</Text>
                )}
              </View>
              <View style={styles.courierActions}>
                {deliveryStatus.courier.phone && (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${deliveryStatus.courier!.phone}`)}
                    style={styles.courierActionBtn}
                  >
                    <Phone size={15} color={colors.green} strokeWidth={1.8} />
                  </Pressable>
                )}
                {deliveryStatus.tracking_url && (
                  <Pressable
                    onPress={() => Linking.openURL(deliveryStatus.tracking_url!)}
                    style={styles.courierActionBtn}
                  >
                    <ExternalLink size={15} color={colors.green} strokeWidth={1.8} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Address */}
        {order?.deliveryAddress && (
          <View style={styles.addressRow}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.addressText} numberOfLines={1}>
              {order.deliveryAddress.street}, {order.deliveryAddress.postalCode} {order.deliveryAddress.city}
            </Text>
          </View>
        )}

        {/* Order items — compact or expanded */}
        {order && (
          <View style={styles.orderCard}>
            <Pressable onPress={() => setShowOrderDetails((v) => !v)} style={styles.orderCompactRow}>
              <Text style={styles.orderCompactTitle}>
                {order.items.reduce((s, i) => s + i.quantity, 0)} article{order.items.length > 1 ? 's' : ''} · {((order.total) / 100).toFixed(2).replace('.', ',')} €
              </Text>
              <View style={styles.orderDetailBtn}>
                <Text style={styles.orderDetailBtnText}>{showOrderDetails ? 'Masquer' : 'Détails'}</Text>
              </View>
            </Pressable>
            {showOrderDetails && (
              <View style={styles.orderDetailsList}>
                {order.items.map((item, i) => (
                  <View key={i} style={styles.orderItemRow}>
                    <Text style={styles.orderItemQty}>{item.quantity}×</Text>
                    <Text style={styles.orderItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.orderItemPrice}>
                      {((item.totalPrice) / 100).toFixed(2).replace('.', ',')} €
                    </Text>
                  </View>
                ))}
                {order.deliveryFee != null && order.deliveryFee > 0 && (
                  <View style={styles.orderItemRow}>
                    <Text style={styles.orderItemQty} />
                    <Text style={styles.orderItemName}>Frais de livraison</Text>
                    <Text style={styles.orderItemPrice}>
                      {((order.deliveryFee) / 100).toFixed(2).replace('.', ',')} €
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Retour accueil */}
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.homeBtnText}>Retour à l'accueil</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// Minimal map style (muted colors to match Teaven aesthetic)
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A8A82' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e8e7e2' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ddddd5' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d5d4cc' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d6c9' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e0e8e0' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, marginTop: spacing.md },

  // Header
  headerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg + 48, paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  headerTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },

  // Map
  mapContainer: {
    height: 280, width: '100%', overflow: 'hidden',
  },
  map: { flex: 1 },
  etaOverlay: {
    position: 'absolute', top: 80, right: spacing.xl,
    backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  etaTime: { fontFamily: fonts.monoSemiBold, fontSize: 18, color: colors.green },
  etaLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.textMuted, marginTop: 1 },

  // Markers
  markerStore: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  markerDestination: {
    alignItems: 'center',
  },
  markerCourier: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#2C4A32',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5,
  },

  // Bottom sheet
  bottomSheet: {
    flex: 1, backgroundColor: colors.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, paddingTop: spacing.xl, paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },

  // Progress
  progressSection: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: spacing.md,
    ...shadows.card,
  },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  statusBadge: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center',
  },
  statusBadgeDone: { backgroundColor: colors.green },
  statusBadgeCancelled: { backgroundColor: colors.error },
  statusTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
  statusETA: { fontFamily: fonts.regular, fontSize: 12, color: colors.green, marginTop: 2 },
  progressTrack: {
    height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    height: 4, backgroundColor: colors.green, borderRadius: 2,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStepLabel: { fontFamily: fonts.regular, fontSize: 9, color: colors.textMuted },
  progressStepLabelActive: { fontFamily: fonts.bold, color: colors.green },

  // Courier
  courierCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: spacing.md,
    ...shadows.card,
  },
  courierRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courierAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.greenLight,
    alignItems: 'center', justifyContent: 'center',
  },
  courierName: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  courierVehicle: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  courierActions: { flexDirection: 'row', gap: 8 },
  courierActionBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center',
  },

  // Address
  addressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 4, marginBottom: spacing.sm,
  },
  addressText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, flex: 1 },

  // Order card
  orderCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  orderCompactRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  orderCompactTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  orderDetailBtn: {
    backgroundColor: colors.greenLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  orderDetailBtnText: { fontFamily: fonts.bold, fontSize: 11, color: colors.green },
  orderDetailsList: { marginTop: spacing.md, gap: 3 },
  orderItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  orderItemQty: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, width: 24 },
  orderItemName: { fontFamily: fonts.regular, fontSize: 12, color: colors.text, flex: 1 },
  orderItemPrice: { fontFamily: fonts.monoSemiBold, fontSize: 11, color: colors.textSecondary },

  // Home
  homeBtn: {
    height: 48, backgroundColor: colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', ...shadows.subtle,
  },
  homeBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
});
