// Écran Panier & Checkout — données dynamiques depuis cartStore + orderStore
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import {
  ChevronLeft,
  ShoppingBag,
  Star,
  MapPin,
  Clock,
  Minus,
  Plus,
  Trash2,
  Tag,
  X,
  Check,
  Truck,
  Home,
  ChevronRight,
  Wallet,
  Gift,
  Sparkles,
  Calendar,
} from 'lucide-react-native';
import { TextInput } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { RechargeModal } from '@/components/ui/RechargeModal';
import TimeSlotPicker from '@/components/ui/TimeSlotPicker';
import { getFreshTimeSlots, getTimeSlotsWithHours, getTomorrowTimeSlots, hasAvailableSlotsToday } from '@/constants/mockTimeSlots';
import { useCart } from '@/hooks/useCart';
import { useLocation } from '@/hooks/useLocation';
import { useUser, LEVEL_MULTIPLIERS } from '@/hooks/useUser';
import { useCatalog } from '@/hooks/useCatalog';
import { useToast } from '@/contexts/ToastContext';
import { useOrderStore } from '@/stores/orderStore';
import { useCartStore } from '@/stores/cartStore';
import { colors, fonts, spacing, typography } from '@/constants/theme';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';
import type { TimeSlot as PickerTimeSlot } from '@/components/ui/TimeSlotPicker';
import type { Reward } from '@/lib/types';

// Codes promo valides — à déplacer dans Supabase plus tard
const PROMO_CODES: Record<string, { type: 'percent' | 'fixed'; value: number; label: string; description: string }> = {
  'BIENVENUE': { type: 'percent', value: 15, label: '-15%', description: 'Code bienvenue' },
  'TEAVEN10':  { type: 'percent', value: 10, label: '-10%', description: '-10% sur votre commande' },
  'TEAVEN20':  { type: 'percent', value: 20, label: '-20%', description: '-20% sur votre commande' },
  'CADEAU5':   { type: 'fixed',   value: 500, label: '-5,00 €', description: 'Bon cadeau 5 €' },
  'CADEAU10':  { type: 'fixed',   value: 1000, label: '-10,00 €', description: 'Bon cadeau 10 €' },
};

function calcPromoDiscount(
  promo: { type: 'percent' | 'fixed'; value: number } | null,
  subtotal: number,
): number {
  if (!promo) return 0;
  if (promo.type === 'percent') return Math.round(subtotal * promo.value / 100);
  return Math.min(promo.value, subtotal);
}

// Récompenses-panier supprimées — seuls les paliers fidélité comptent (les points ne font que monter)

function buildPickerSlots(openHour?: number, closeHour?: number, tomorrow = false): PickerTimeSlot[] {
  const oh = openHour ?? 9;
  const ch = closeHour ?? 20;
  const slots = tomorrow
    ? getTomorrowTimeSlots(oh, ch)
    : (openHour != null && closeHour != null)
      ? getTimeSlotsWithHours(openHour, closeHour)
      : getFreshTimeSlots();
  return slots.map((slot) => ({
    id: slot.id,
    timeRange: slot.id === 'asap' ? '' : slot.label,
    queueCount: slot.ordersInQueue,
    available: slot.available,
    isAsap: slot.id === 'asap',
  }));
}

// PaymentMethod supprimé — choix sur l'écran checkout

export default function PanierScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    items,
    totalItems,
    subtotal,
    tax,
    updateQuantity,
    removeItem,
    formatPrice,
    getItemKey,
  } = useCart();
  const addItem = useCartStore((s) => s.addItem);

  const { loyalty, wallet, rechargeWallet } = useUser();
  const { location: storeLocation } = useLocation();
  const [rechargeVisible, setRechargeVisible] = useState(false);
  const { allProducts } = useCatalog();
  const { showToast } = useToast();
  // paymentMethod supprimé — le choix se fait sur l'écran checkout
  // Récompenses-panier supprimées — paliers fidélité uniquement
  const storePromoCode = useCartStore((s) => s.activePromoCode);
  const setStorePromoCode = useCartStore((s) => s.setPromoCode);

  // Code promo
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; type: 'percent' | 'fixed'; value: number; label: string; description: string } | null>(() => {
    if (!storePromoCode) return null;
    const found = PROMO_CODES[storePromoCode];
    if (!found) return null;
    return { code: storePromoCode, ...found };
  });
  const [promoError, setPromoError] = useState('');

  // Récompenses-panier supprimées — points ne font que monter
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('asap');
  const [businessHours, setBusinessHours] = useState<{ open: number; close: number } | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [closedDays, setClosedDays] = useState<number[]>([]); // 0=dim, 1=lun, ...
  useEffect(() => {
    fetch(`${SUPABASE_URL}/functions/v1/get-business-hours`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.closed) {
          setIsClosed(true);
          setBusinessHours({ open: 9, close: 20 });
        } else if (data.open != null && data.close != null) {
          setBusinessHours({ open: data.open, close: data.close });
          setIsClosed(false);
        }
        // Jours fermés depuis le planning semaine
        if (data.weekSchedule) {
          const dayMap: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
          const closed: number[] = [];
          for (const [day, hours] of Object.entries(data.weekSchedule)) {
            if (hours === null) closed.push(dayMap[day] ?? -1);
          }
          setClosedDays(closed);
        }
      })
      .catch(() => {});
  }, []);
  // pickerSlots construit plus bas après pickupDayOffset
  const [isOrdering, setIsOrdering] = useState(false);
  type DeliveryMode = 'pickup' | 'delivery';
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryComplement, setDeliveryComplement] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryPostal, setDeliveryPostal] = useState('');
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ place_id: string; description: string; main_text: string; secondary_text: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // rewardsExpanded supprimé — plus de récompenses dans le panier
  // Auto-switch to tomorrow if no slots available today
  const todaySlots = buildPickerSlots(businessHours?.open, businessHours?.close, false);
  const hasTodaySlots = todaySlots.some((s) => s.available);
  const [pickupDayOffset, setPickupDayOffset] = useState(0);
  const autoTomorrow = !hasTodaySlots && pickupDayOffset === 0;
  const effectiveDayOffset = autoTomorrow ? 1 : pickupDayOffset;
  const pickerSlots = effectiveDayOffset === 0
    ? todaySlots
    : buildPickerSlots(businessHours?.open, businessHours?.close, true).filter((s) => !s.isAsap);
  const DELIVERY_FEE = 490; // 4,90€ en centimes (placeholder Uber Direct)
  const createOrder = useOrderStore((s) => s.createOrder);
  const orderHistory = useOrderStore((s) => s.orderHistory ?? []);
  const cartItems = useCartStore((s) => s.items);
  // ─── Google Places autocomplete ──────────────────────────────────────────
  const SUPA_URL = SUPABASE_URL;
  const SUPA_KEY = SUPABASE_ANON_KEY;

  const searchAddress = (text: string) => {
    setAddressQuery(text);
    if (text.length < 3) { setAddressSuggestions([]); setShowSuggestions(false); return; }
    if (addressSearchTimer.current) clearTimeout(addressSearchTimer.current);
    addressSearchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${SUPA_URL}/functions/v1/google-places?action=autocomplete&input=${encodeURIComponent(text)}`,
          { headers: { 'Authorization': `Bearer ${SUPA_KEY}`, 'apikey': SUPA_KEY } },
        );
        const json = await res.json();
        setAddressSuggestions(json.predictions ?? []);
        setShowSuggestions(true);
      } catch { setAddressSuggestions([]); }
    }, 300);
  };

  const selectAddress = async (placeId: string, description: string) => {
    setShowSuggestions(false);
    setAddressQuery(description);
    try {
      const res = await fetch(
        `${SUPA_URL}/functions/v1/google-places?action=details&place_id=${placeId}`,
        { headers: { 'Authorization': `Bearer ${SUPA_KEY}`, 'apikey': SUPA_KEY } },
      );
      const details = await res.json();
      setDeliveryAddress(details.street || description);
      setDeliveryCity(details.city || '');
      setDeliveryPostal(details.postal_code || '');
      setDeliveryLat(details.latitude ?? null);
      setDeliveryLng(details.longitude ?? null);
    } catch {
      setDeliveryAddress(description);
    }
  };

  const applyPromoCode = () => {
    const code = promoInput.trim().toUpperCase();
    if (code === 'BIENVENUE' && orderHistory.length > 0) {
      setPromoError('Code réservé à la première commande');
      return;
    }
    const found = PROMO_CODES[code];
    if (!found) {
      setPromoError('Code invalide ou expiré');
      return;
    }
    setAppliedPromo({ code, ...found });
    setStorePromoCode(code);
    setPromoInput('');
    setPromoError('');
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setStorePromoCode(null);
    setPromoError('');
  };

  // Calculs récap — prix Square TTC, pas de TVA séparée
  const promoDiscount = calcPromoDiscount(appliedPromo, subtotal);
  const deliveryFee = deliveryMode === 'delivery' ? DELIVERY_FEE : 0;
  const sereniteOrAbove = loyalty.level === 'Sérénité' || loyalty.level === 'Essentia';
  const loyaltyAutoDiscount = sereniteOrAbove ? Math.round(subtotal * 0.05) : 0;
  const total = Math.max(0, subtotal - promoDiscount - loyaltyAutoDiscount) + deliveryFee;

  // Estimation points gagnés — basé sur le TOTAL payé (après remises)
  const multiplier = LEVEL_MULTIPLIERS[loyalty.level] ?? 1;
  const estimatedPoints = Math.floor((total / 100) * 10 * multiplier);

  // paymentOptions supprimé

  // État vide
  if (items.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Votre panier</Text>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          icon={<ShoppingBag size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title="Votre panier est vide"
          subtitle="Découvrez notre carte pour trouver votre bonheur"
          ctaLabel="Explorer la carte"
          onCtaPress={() => router.push('/(tabs)/carte')}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle}>Votre panier</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ──── ARTICLES ──── */}
        <Text style={styles.sectionLabel}>ARTICLES</Text>
        <View style={styles.section}>
          {items.map((item) => {
            const key = getItemKey(item);
            return (
              <View key={key} style={styles.articleCard}>
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.articleImage}
                  contentFit="cover"
                  placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                />
                <View style={styles.articleInfo}>
                  <Text style={styles.articleName}>{item.product.name}</Text>
                  <Text style={styles.articlePrice}>
                    {formatPrice(item.product.price)}
                  </Text>
                </View>
                <View style={styles.qtyArea}>
                  <View style={styles.qtySelector}>
                    <Pressable
                      onPress={() => updateQuantity(key, item.quantity - 1)}
                      style={styles.qtyButton}
                      accessibilityLabel="Réduire la quantité"
                    >
                      <Minus size={12} color={colors.textSecondary} strokeWidth={2} />
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => updateQuantity(key, item.quantity + 1)}
                      style={styles.qtyButton}
                      accessibilityLabel="Augmenter la quantité"
                    >
                      <Plus size={12} color={colors.textSecondary} strokeWidth={2} />
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => removeItem(key)}
                    style={styles.deleteButton}
                    accessibilityLabel="Supprimer l'article"
                  >
                    <Trash2 size={14} color={colors.error} strokeWidth={1.8} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* ──── UPSELL ──── */}
        {(() => {
          const cartCategories = new Set(cartItems.map((item) => item.product.category));
          const cartIds = new Set(cartItems.map((item) => item.product.id));
          const hasBoisson = cartItems.some((item) => {
            const cat = (item.product.category ?? '').toLowerCase();
            const name = (item.product.name ?? '').toLowerCase();
            return cat.includes('boisson') || name.includes('thé') || name.includes('café') || name.includes('matcha') || name.includes('jus');
          });
          const hasDessert = cartItems.some((item) => {
            const cat = (item.product.category ?? '').toLowerCase();
            return cat.includes('patisserie') || cat.includes('dessert');
          });
          const maxUpsellPrice = Math.max(subtotal * 0.5, 500); // Max 50% du sous-total ou 5€

          const upsellItems = allProducts
            .filter((p) => !cartIds.has(p.id) && p.price <= maxUpsellPrice)
            .map((p) => {
              const cat = (p.category ?? '').toLowerCase();
              const name = (p.name ?? '').toLowerCase();
              let score = 0;
              const isBoisson = cat.includes('boisson') || name.includes('thé') || name.includes('café') || name.includes('matcha') || name.includes('jus');
              const isDessert = cat.includes('patisserie') || cat.includes('dessert');
              // Prioriser ce qui manque au panier
              if (!hasBoisson && isBoisson) score += 10;
              if (!hasDessert && isDessert) score += 8;
              // Produits populaires et de saison
              if (p.isPopular) score += 5;
              if (p.isSeasonal) score += 4;
              if (p.isNew) score += 3;
              // Petits prix en complément
              if (p.price < 600) score += 2;
              return { product: p, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((item) => item.product);
          if (upsellItems.length === 0) return null;
          return (
            <View style={styles.upsellSection}>
              <View style={styles.upsellHeader}>
                <Sparkles size={13} color={colors.green} strokeWidth={1.8} />
                <Text style={styles.upsellTitle}>Complétez votre commande</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upsellScroll}>
                {upsellItems.map((p) => (
                  <Pressable
                    key={p.id}
                    style={styles.upsellCard}
                    onPress={() => {
                      addItem(p, 1);
                      showToast(`${p.name} ajouté`);
                    }}
                  >
                    {p.image ? (
                      <Image source={{ uri: p.image }} style={styles.upsellImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.upsellImage, { backgroundColor: colors.greenLight }]} />
                    )}
                    <Text style={styles.upsellName} numberOfLines={1}>{p.name}</Text>
                    <View style={styles.upsellBottom}>
                      <Text style={styles.upsellPrice}>{formatPrice(p.price)}</Text>
                      <View style={styles.upsellAddBtn}>
                        <Plus size={12} color="#FFFFFF" strokeWidth={2.5} />
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })()}

        {/* ──── MODE DE RÉCUPÉRATION ──── */}
        <Text style={styles.sectionLabel}>MODE DE RÉCUPÉRATION</Text>
        <View style={styles.deliveryToggle}>
          <Pressable
            style={[styles.deliveryOption, deliveryMode === 'pickup' && styles.deliveryOptionActive]}
            onPress={() => setDeliveryMode('pickup')}
            accessibilityRole="button"
            accessibilityLabel="Retrait en boutique"
          >
            <ShoppingBag size={15} color={deliveryMode === 'pickup' ? '#FFFFFF' : colors.textSecondary} strokeWidth={1.8} />
            <Text style={[styles.deliveryOptionText, deliveryMode === 'pickup' && styles.deliveryOptionTextActive]}>
              Retrait
            </Text>
          </Pressable>
          <Pressable
            style={[styles.deliveryOption, deliveryMode === 'delivery' && styles.deliveryOptionActive]}
            onPress={() => setDeliveryMode('delivery')}
            accessibilityRole="button"
            accessibilityLabel="Livraison à domicile"
          >
            <Truck size={15} color={deliveryMode === 'delivery' ? '#FFFFFF' : colors.textSecondary} strokeWidth={1.8} />
            <Text style={[styles.deliveryOptionText, deliveryMode === 'delivery' && styles.deliveryOptionTextActive]}>
              Livraison
            </Text>
          </Pressable>
        </View>

        {deliveryMode === 'pickup' ? (
          <View style={styles.collectCard}>
            <View style={styles.collectHeader}>
              <ShoppingBag size={14} color="#4A6B50" strokeWidth={2} />
              <Text style={styles.collectTitle}>Click & Collect</Text>
            </View>

            {/* Adresse du point de vente */}
            <View style={styles.storeAddressCard}>
              <MapPin size={14} color={colors.green} strokeWidth={1.5} />
              <View style={{ flex: 1 }}>
                <Text style={styles.storeAddressName}>{storeLocation.name || 'Teaven'}</Text>
                <Text style={styles.storeAddressText}>{storeLocation.addressFormatted || 'Chargement...'}</Text>
              </View>
            </View>

            <View style={styles.collectDivider} />

            {/* Sélecteur de jour */}
            <Text style={styles.slotLabel}>JOUR DE RETRAIT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPicker}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
                const label = i === 0 ? "Auj." : i === 1 ? 'Dem.' : dayNames[d.getDay()];
                const dateLabel = `${d.getDate()} ${monthNames[d.getMonth()]}`;
                const active = effectiveDayOffset === i;
                const todayDisabled = i === 0 && !hasTodaySlots;
                const dayIsClosed = closedDays.includes(d.getDay());
                const isDisabled = todayDisabled || dayIsClosed;
                return (
                  <Pressable
                    key={i}
                    style={[styles.dayChip, active && styles.dayChipActive, isDisabled && { opacity: 0.35 }]}
                    onPress={() => {
                      if (isDisabled) return;
                      setPickupDayOffset(i);
                      setSelectedTimeSlot(i === 0 ? 'asap' : '');
                    }}
                  >
                    <Text style={[styles.dayChipLabel, active && styles.dayChipLabelActive]}>{label}</Text>
                    <Text style={[styles.dayChipDate, active && styles.dayChipDateActive]}>
                      {dayIsClosed ? 'Fermé' : dateLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.collectDivider} />

            {/* Message fermé */}
            {autoTomorrow && (
              <View style={{ backgroundColor: '#FDF6ED', borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: '#B8860B', textAlign: 'center' }}>
                  Teaven est actuellement fermé. Préparez votre commande pour demain !
                </Text>
              </View>
            )}

            {/* Créneaux */}
            <Text style={styles.slotLabel}>
              {effectiveDayOffset === 0 ? 'CRÉNEAU DE RETRAIT' : 'CHOISISSEZ UN CRÉNEAU'}
            </Text>
            <TimeSlotPicker
              slots={pickerSlots}
              selectedId={selectedTimeSlot}
              onSelect={setSelectedTimeSlot}
            />
          </View>
        ) : (
          <View style={styles.collectCard}>
            <View style={styles.collectHeader}>
              <Truck size={14} color="#4A6B50" strokeWidth={2} />
              <Text style={styles.collectTitle}>Livraison à domicile</Text>
            </View>

            {/* Adresse : état vide ou rempli */}
            {deliveryAddress.length === 0 ? (
              <View style={styles.addressSection}>
                {/* Champ recherche proéminent */}
                <Pressable style={styles.addressSearchCard}>
                  <View style={styles.addressSearchIcon}>
                    <MapPin size={18} color={colors.green} strokeWidth={1.5} />
                  </View>
                  <TextInput
                    style={styles.addressSearchInput}
                    placeholder="Où souhaitez-vous être livré ?"
                    placeholderTextColor={colors.textMuted}
                    value={addressQuery}
                    onChangeText={searchAddress}
                    returnKeyType="search"
                  />
                </Pressable>

                {/* Suggestions */}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <View style={styles.suggestionsWrap}>
                    {addressSuggestions.map((s) => (
                      <Pressable
                        key={s.place_id}
                        style={styles.suggestionRow}
                        onPress={() => selectAddress(s.place_id, s.description)}
                      >
                        <View style={styles.suggestionIcon}>
                          <MapPin size={14} color={colors.green} strokeWidth={1.5} />
                        </View>
                        <View style={styles.suggestionText}>
                          <Text style={styles.suggestionMain}>{s.main_text}</Text>
                          <Text style={styles.suggestionSub}>{s.secondary_text}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.addressSection}>
                {/* Adresse confirmée */}
                <View style={styles.addressFilledCard}>
                  <View style={styles.addressFilledLeft}>
                    <View style={styles.addressFilledIcon}>
                      <Check size={14} color={colors.green} strokeWidth={2.5} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addressFilledStreet}>{deliveryAddress}</Text>
                      {deliveryPostal ? (
                        <Text style={styles.addressFilledCity}>{deliveryPostal} {deliveryCity}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => { setDeliveryAddress(''); setAddressQuery(''); setDeliveryCity(''); setDeliveryPostal(''); }}
                    hitSlop={8}
                  >
                    <Text style={styles.addressChangeBtn}>Modifier</Text>
                  </Pressable>
                </View>

                {/* Complément */}
                <View style={styles.complementRow}>
                  <Home size={14} color={colors.textSecondary} strokeWidth={1.5} />
                  <TextInput
                    style={styles.complementInput}
                    placeholder="Bâtiment, étage, code d'entrée..."
                    placeholderTextColor={colors.textMuted}
                    value={deliveryComplement}
                    onChangeText={setDeliveryComplement}
                    returnKeyType="done"
                  />
                </View>
              </View>
            )}

            <View style={styles.collectAddressRow}>
              <Clock size={12} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={styles.collectAddress}>Estimé : 25-40 min · Frais : 4,90 {'\u20AC'}</Text>
            </View>
            <View style={styles.collectDivider} />
            <Text style={styles.slotLabel}>CRÉNEAU DE LIVRAISON</Text>
            <TimeSlotPicker
              slots={pickerSlots}
              selectedId={selectedTimeSlot}
              onSelect={setSelectedTimeSlot}
            />
          </View>
        )}

        {/* ──── FIDÉLITÉ ──── */}
        {(() => {
          const THEMES: Record<string, { gradient: readonly [string, string, string]; text: string; sub: string; prog: string; track: string }> = {
            'Première Parenthèse': { gradient: ['#F7F4ED', '#EDE8D8', '#E4DFC8'], text: '#2C3A2E', sub: '#738478', prog: '#75967F', track: 'rgba(117,150,127,0.15)' },
            'Habitude':            { gradient: ['#E8EDDF', '#D8E5D2', '#C8DCCA'], text: '#1E3022', sub: '#4A6B50', prog: '#5B7A65', track: 'rgba(117,150,127,0.18)' },
            'Rituel':              { gradient: ['#C2D8C6', '#A8C8AE', '#8EB898'], text: '#1A2E1E', sub: '#2C4A32', prog: '#2C4A32', track: 'rgba(255,255,255,0.3)' },
            'Sérénité':            { gradient: ['#75967F', '#5B7A65', '#4A6B50'], text: '#FFFFFF', sub: 'rgba(255,255,255,0.75)', prog: '#FFFFFF', track: 'rgba(255,255,255,0.2)' },
            'Essentia':            { gradient: ['#3A5A3E', '#2C4A32', '#1A2E1E'], text: '#FFFFFF', sub: 'rgba(255,255,255,0.7)', prog: 'rgba(255,255,255,0.9)', track: 'rgba(255,255,255,0.12)' },
          };
          const t = THEMES[loyalty.level] ?? THEMES['Première Parenthèse'];
          const circR = 18;
          const circC = 2 * Math.PI * circR;
          return (
            <Pressable onPress={() => router.push('/fidelite')} style={styles.loyaltyWrap}>
              <LinearGradient
                colors={t.gradient as [string, string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loyaltyCard}
              >
                <View style={styles.loyaltyLeft}>
                  {/* Mini-cercle progression */}
                  <View style={styles.loyaltyCircleWrap}>
                    <Svg width={42} height={42} viewBox="0 0 42 42">
                      <SvgCircle cx={21} cy={21} r={circR} stroke={t.track} strokeWidth={2.5} fill="none" />
                      <SvgCircle
                        cx={21} cy={21} r={circR}
                        stroke={t.prog}
                        strokeWidth={2.5}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${circC}`}
                        strokeDashoffset={`${circC * (1 - loyalty.progressPercent / 100)}`}
                        transform="rotate(-90 21 21)"
                      />
                    </Svg>
                    <Star size={14} color={t.prog} fill={t.prog} strokeWidth={0} style={{ position: 'absolute' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.loyaltyTitle, { color: t.text }]}>{loyalty.level}</Text>
                    <Text style={[styles.loyaltyBalance, { color: t.sub }]}>
                      {loyalty.points.toLocaleString('fr-FR')} pts · {loyalty.nextReward}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color={t.sub} strokeWidth={1.5} />
              </LinearGradient>
            </Pressable>
          );
        })()}

        {/* ──── CODE PROMO ──── */}
        <Text style={styles.sectionLabel}>CODE PROMO</Text>
        {appliedPromo ? (
          <View style={styles.promoApplied}>
            <View style={styles.promoAppliedLeft}>
              <View style={styles.promoAppliedIcon}>
                <Tag size={14} color={colors.green} strokeWidth={1.8} />
              </View>
              <View>
                <Text style={styles.promoAppliedCode}>{appliedPromo.code}</Text>
                <Text style={styles.promoAppliedDesc}>{appliedPromo.description} · {appliedPromo.label}</Text>
              </View>
            </View>
            <Pressable onPress={removePromo} hitSlop={8} accessibilityLabel="Retirer le code promo">
              <X size={16} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.promoInputWrap}>
            <View style={styles.promoInputRow}>
              <Tag size={15} color={colors.textMuted} strokeWidth={1.8} style={styles.promoInputIcon} />
              <TextInput
                style={styles.promoInput}
                placeholder="Entrez votre code"
                placeholderTextColor={colors.textMuted}
                value={promoInput}
                onChangeText={(t) => { setPromoInput(t); setPromoError(''); }}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={applyPromoCode}
              />
              <Pressable
                style={[styles.promoApplyBtn, !promoInput.trim() && { opacity: 0.4 }]}
                onPress={applyPromoCode}
                disabled={!promoInput.trim()}
                accessibilityLabel="Appliquer le code promo"
              >
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>
            {promoError ? (
              <Text style={styles.promoError}>{promoError}</Text>
            ) : null}
          </View>
        )}

        {/* ──── RÉCAPITULATIF ──── */}
        <View style={styles.recap}>
          <View style={styles.recapRow}>
            <Text style={styles.recapLabel}>Sous-total</Text>
            <Text style={styles.recapValue}>{formatPrice(subtotal)}</Text>
          </View>
          {/* Récompenses-panier supprimées — paliers fidélité uniquement */}
          {loyaltyAutoDiscount > 0 && (
            <View style={styles.recapRow}>
              <Text style={[styles.recapLabel, styles.recapDiscount]}>
                -5% fidélité
              </Text>
              <Text style={[styles.recapValue, styles.recapDiscount]}>
                -{formatPrice(loyaltyAutoDiscount)}
              </Text>
            </View>
          )}
          {appliedPromo && promoDiscount > 0 && (
            <View style={styles.recapRow}>
              <Text style={[styles.recapLabel, styles.recapDiscount]}>
                Code {appliedPromo.code}
              </Text>
              <Text style={[styles.recapValue, styles.recapDiscount]}>
                -{formatPrice(promoDiscount)}
              </Text>
            </View>
          )}
          {deliveryMode === 'delivery' && (
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Frais de livraison</Text>
              <Text style={styles.recapValue}>{formatPrice(DELIVERY_FEE)}</Text>
            </View>
          )}
          <View style={styles.recapDivider} />
          <View style={styles.recapRow}>
            <Text style={styles.recapTotalLabel}>Total</Text>
            <Text style={styles.recapTotalValue}>{formatPrice(total)}</Text>
          </View>
          {estimatedPoints > 0 && (
            <View style={styles.recapRow}>
              <Text style={styles.recapPointsLabel}>Points gagnés</Text>
              <Text style={styles.recapPointsValue}>+ {estimatedPoints.toLocaleString('fr-FR')} pts{multiplier > 1 ? ` (×${multiplier})` : ''}</Text>
            </View>
          )}
        </View>

        {/* Récompenses-panier supprimées — programme fidélité à paliers uniquement */}

        {/* ──── WALLET ──── */}
        <Pressable
          style={styles.walletMiniWrap}
          onPress={() => {
            if (wallet.balance >= total) {
              router.push({ pathname: '/checkout', params: { total: String(total) } });
            } else {
              setRechargeVisible(true);
            }
          }}
        >
          <LinearGradient
            colors={['#D4937A', '#C27B5A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletMini}
          >
            <View style={styles.walletMiniLeft}>
              <Wallet size={15} color="rgba(255,255,255,0.7)" strokeWidth={1.5} />
              <View>
                <Text style={styles.walletMiniLabel}>Porte-monnaie</Text>
                <Text style={styles.walletMiniBalance}>{formatPrice(wallet.balance)}</Text>
              </View>
            </View>
            {wallet.balance >= total ? (
              <View style={styles.walletMiniOk}>
                <Check size={12} color="#C27B5A" strokeWidth={2.5} />
                <Text style={styles.walletMiniOkText}>Payer avec</Text>
              </View>
            ) : (
              <View style={styles.walletMiniLow}>
                <Text style={styles.walletMiniLowText}>Recharger</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>

        {/* Section paiement supprimée — le choix se fait sur l'écran checkout (toggle wallet) */}

      </ScrollView>

      {/* ──── CTA sticky ──── */}
      <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={() => {
            // Construire le datetime de retrait depuis le créneau sélectionné
            let pickupISO = '';
            const slot = pickerSlots.find((s) => s.id === selectedTimeSlot);
            if (slot && slot.timeRange) {
              // timeRange = "14:00 - 14:15" → extraire l'heure de début
              const [startTime] = slot.timeRange.split(' - ');
              const [h, m] = startTime.split(':').map(Number);
              const d = new Date();
              d.setDate(d.getDate() + effectiveDayOffset);
              d.setHours(h, m, 0, 0);
              pickupISO = d.toISOString();
            } else {
              // ASAP → maintenant + 20 min
              const d = new Date(Date.now() + 20 * 60 * 1000);
              d.setDate(d.getDate() + effectiveDayOffset);
              pickupISO = d.toISOString();
            }
            // Construire les discounts à passer au checkout
            const checkoutDiscounts: Array<{ name: string; percentage?: string; amountCents?: number }> = [];
            if (appliedPromo && promoDiscount > 0) {
              if (appliedPromo.type === 'percent') {
                checkoutDiscounts.push({ name: appliedPromo.description || `Code ${appliedPromo.code}`, percentage: String(appliedPromo.value) });
              } else {
                checkoutDiscounts.push({ name: appliedPromo.description || `Code ${appliedPromo.code}`, amountCents: promoDiscount });
              }
            }

            router.push({
              pathname: '/checkout',
              params: {
                total: String(total),
                pickupTime: pickupISO,
                // Rewards supprimés du panier
                ...(checkoutDiscounts.length > 0 ? { discounts: JSON.stringify(checkoutDiscounts) } : {}),
              },
            });
          }}
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Passer au paiement, ${formatPrice(total)}`}
        >
          <Text style={styles.ctaText}>
            Passer au paiement — {formatPrice(total)}
          </Text>
        </Pressable>
        <Text style={styles.ctaDisclaimer}>
          En validant, vous acceptez nos conditions générales de vente.
        </Text>
      </View>

      {/* ──── CHANTIER 1 — Modal recharge wallet depuis le panier ──── */}
      <RechargeModal
        visible={rechargeVisible}
        onClose={() => setRechargeVisible(false)}
        onPayByCard={(amount) => { setRechargeVisible(false); router.push({ pathname: '/recharge', params: { amount: String(amount) } }); }}
        onRecharge={(amount) => {
          rechargeWallet(amount);
          setRechargeVisible(false);
          showToast(`+${(amount / 100).toFixed(0)} € crédités sur votre wallet`);
        }}
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
  },

  // Section label
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 3,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },

  // Article cards
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 10,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  articleImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  articleInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  articleName: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.text,
  },
  articlePrice: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.green,
    marginTop: 2,
  },
  qtyArea: {
    alignItems: 'flex-end',
    gap: 6,
  },
  qtySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    minWidth: 16,
    textAlign: 'center',
  },
  deleteButton: {
    width: 28,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Click & Collect
  collectCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  collectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collectTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#4A6B50',
  },
  collectAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectAddress: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  collectSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F0',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  collectSlotText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  collectDivider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  slotLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2.5,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  addressInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addressInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },

  // Fidélité
  loyaltyWrap: {
    marginTop: spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 14,
  },
  loyaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  loyaltyCircleWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  loyaltyBalance: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 2,
  },

  // Récapitulatif
  recap: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recapLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  recapValue: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.text,
  },
  recapDiscount: {
    color: colors.green,
  },
  recapDivider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  recapTotalLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  recapTotalValue: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    color: colors.green,
  },

  // Récompenses
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rewardCardApplied: {
    borderColor: colors.green,
    backgroundColor: '#F8FAF8',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  rewardNameApplied: {
    color: colors.green,
  },
  rewardDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  rewardPtsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F0',
  },
  rewardPtsBadgeApplied: {
    backgroundColor: colors.greenLight,
  },
  rewardPtsText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
  },
  rewardPtsTextApplied: {
    color: colors.green,
    fontFamily: fonts.monoSemiBold,
  },

  // Paiement
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    gap: spacing.md,
  },
  paymentCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: '#F8FAF8',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.green,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  paymentLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  paymentLabelSelected: {
    fontFamily: fonts.bold,
  },

  // CTA
  cta: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  ctaButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  ctaDisclaimer: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  timeSlotSection: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },

  // Code promo
  promoInputWrap: {
    gap: spacing.sm,
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 50,
    gap: spacing.sm,
  },
  promoInputIcon: {
    flexShrink: 0,
  },
  promoInput: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    letterSpacing: 1,
  },
  promoApplyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.error,
    paddingLeft: 4,
  },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2FAF3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B8D4BC',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  promoAppliedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  promoAppliedIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoAppliedCode: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
    letterSpacing: 1,
  },
  promoAppliedDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Mode livraison
  deliveryToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: spacing.sm,
  },
  deliveryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deliveryOptionActive: {
    backgroundColor: colors.green,
  },
  deliveryOptionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  deliveryOptionTextActive: {
    color: '#FFFFFF',
  },
  deliveryNote: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  paymentMicroText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  pointsEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: 10,
  },
  storeAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.greenLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  storeAddressName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  storeAddressText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  dayPicker: {
    gap: 8,
    paddingVertical: 6,
  },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  dayChipActive: {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  dayChipLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  dayChipLabelActive: {
    color: '#FFFFFF',
  },
  dayChipDate: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  dayChipDateActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  recapPointsLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.green,
    marginTop: 6,
  },
  recapPointsValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
    marginTop: 6,
  },
  // Upsell
  upsellSection: {
    marginTop: spacing.lg,
  },
  upsellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  upsellTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  upsellScroll: {
    gap: 10,
    paddingRight: spacing.xl,
  },
  upsellCard: {
    width: 120,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  upsellImage: {
    width: '100%',
    height: 80,
  },
  upsellName: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.text,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  upsellBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  upsellPrice: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  upsellAddBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Récompenses dépliable
  rewardsCollapsible: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  rewardsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  rewardsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rewardsHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  rewardsHeaderSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rewardsBody: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    padding: 10,
    gap: 8,
  },
  addressSection: {
    gap: 10,
    marginBottom: 12,
  },
  addressSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.green,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  addressSearchIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressSearchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  suggestionsWrap: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  suggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMain: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  suggestionSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  addressFilledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0EA',
    borderRadius: 12,
    padding: 12,
  },
  addressFilledLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  addressFilledIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(117,150,127,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressFilledStreet: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  addressFilledCity: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  addressChangeBtn: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
  complementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  complementInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
  },
  walletMiniWrap: {
    marginTop: spacing.lg,
    borderRadius: 14,
    overflow: 'hidden',
  },
  walletMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
  },
  walletMiniLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletMiniLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  walletMiniBalance: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  walletMiniOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  walletMiniOkText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#C27B5A',
  },
  walletMiniLow: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  walletMiniLowText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
});
