// Contexte global — suivi de commande active (livraison ou retrait)
// Fournit l'état de la commande en cours à toute l'app + banner persistant
// + déclenche les Live Activities iOS (Lock Screen) en arrière-plan.
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useOrderStore } from '@/stores/orderStore';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';
import { startOrderActivity, updateOrderActivity, stopOrderActivity } from '@/lib/liveActivity';

export interface ActiveDeliveryState {
  orderId: string;
  mode: 'pickup' | 'delivery';
  status: string;
  statusLabel: string;
  progressPercent: number;
  eta: string | null;
  courierName: string | null;
  trackingUrl: string | null;
  deliveryId: string | null;
}

interface ActiveOrderContextType {
  activeOrder: ActiveDeliveryState | null;
  dismiss: () => void;
  /** Height of the tracking banner when visible, for content padding */
  bannerHeight: number;
}

const ActiveOrderContext = createContext<ActiveOrderContextType>({
  activeOrder: null,
  dismiss: () => {},
  bannerHeight: 0,
});

export function useActiveOrder() {
  return useContext(ActiveOrderContext);
}

const STATUS_LABELS: Record<string, string> = {
  payment_confirmed: 'Commande confirmée',
  pending: 'Commande confirmée',
  courier_assigned: 'Coursier en chemin',
  preparing: 'En préparation',
  picked_up: 'Commande récupérée',
  en_route: 'Livreur en route',
  delivered: 'Livrée !',
  ready: 'Prête !',
  cancelled: 'Annulée',
};

const STATUS_PROGRESS: Record<string, number> = {
  payment_confirmed: 10,
  pending: 15,
  courier_assigned: 30,
  preparing: 50,
  picked_up: 65,
  en_route: 80,
  delivered: 100,
  ready: 90,
};

function formatETA(isoDate: string | null): string | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  const now = new Date();
  const diffMin = Math.round((d.getTime() - now.getTime()) / 60000);
  if (diffMin <= 0) return 'Imminent';
  if (diffMin < 60) return `~${diffMin} min`;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Sub-message warm Teaven cohérent avec le toast suivi (Live Activity Lock Screen). */
function getWarmSubtitle(status: string, mode: 'pickup' | 'delivery'): string {
  if (mode === 'pickup') {
    switch (status) {
      case 'payment_confirmed':
      case 'pending': return 'On s\'y met tout de suite';
      case 'preparing': return 'Votre commande est en cuisine';
      case 'ready': return 'Prête au comptoir, on vous attend';
      case 'delivered':
      case 'completed': return 'Belle parenthèse Teaven';
      case 'cancelled': return 'Commande annulée';
      default: return 'En cours';
    }
  }
  switch (status) {
    case 'payment_confirmed':
    case 'pending': return 'Commande confirmée, on prépare';
    case 'courier_assigned': return 'Un livreur arrive chez nous';
    case 'preparing': return 'On prépare votre commande';
    case 'picked_up': return 'Votre commande est en route';
    case 'en_route': return 'Le livreur arrive bientôt';
    case 'delivered': return 'Livrée. Bon moment Teaven.';
    case 'cancelled':
    case 'returned': return 'Commande annulée';
    default: return 'En cours';
  }
}

export function ActiveOrderProvider({ children }: { children: React.ReactNode }) {
  const currentOrder = useOrderStore((s) => s.currentOrder);
  const [activeOrder, setActiveOrder] = useState<ActiveDeliveryState | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = useCallback(() => {
    if (activeOrder) setDismissed(activeOrder.orderId);
    setActiveOrder(null);
  }, [activeOrder]);

  // Initialize from currentOrder
  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'completed' || currentOrder.status === 'cancelled') {
      setActiveOrder(null);
      return;
    }
    if (dismissed === currentOrder.id) return;

    const status = currentOrder.status ?? 'payment_confirmed';
    setActiveOrder({
      orderId: currentOrder.id,
      mode: currentOrder.mode,
      status,
      statusLabel: STATUS_LABELS[status] ?? 'En cours',
      progressPercent: STATUS_PROGRESS[status] ?? 10,
      eta: null,
      courierName: null,
      trackingUrl: currentOrder.trackingUrl ?? null,
      deliveryId: currentOrder.deliveryId ?? null,
    });
  }, [currentOrder, dismissed]);

  // Poll delivery status for active delivery orders
  useEffect(() => {
    if (!activeOrder || activeOrder.mode !== 'delivery' || activeOrder.status === 'delivered') {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const fetchStatus = async () => {
      try {
        const params = activeOrder.deliveryId
          ? `delivery_id=${encodeURIComponent(activeOrder.deliveryId)}`
          : `order_id=${encodeURIComponent(activeOrder.orderId)}`;

        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/uber-direct-get-status?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
            },
          },
        );
        const data = await res.json();
        if (data.success && data.status) {
          setActiveOrder((prev) => {
            if (!prev) return null;
            const newStatus = data.status;
            if (newStatus === 'delivered') {
              // Auto-dismiss after 30s
              setTimeout(() => setActiveOrder(null), 30_000);
            }
            return {
              ...prev,
              status: newStatus,
              statusLabel: STATUS_LABELS[newStatus] ?? 'En cours',
              progressPercent: STATUS_PROGRESS[newStatus] ?? prev.progressPercent,
              eta: formatETA(data.estimated_dropoff_at),
              courierName: data.courier?.name ?? prev.courierName,
              trackingUrl: data.tracking_url ?? prev.trackingUrl,
            };
          });
        }
      } catch { /* silent */ }
    };

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 15_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeOrder?.orderId, activeOrder?.deliveryId, activeOrder?.mode, activeOrder?.status]);

  // ── Live Activity iOS — synchronise avec activeOrder ──
  // Ne se déclenche que sur iOS 16.2+ (sinon no-op silencieux côté lib).
  const lastSyncedStatusRef = useRef<{ orderId: string; status: string } | null>(null);

  useEffect(() => {
    if (!activeOrder) {
      // Si une Live Activity était active et n'est plus → arrêter
      const last = lastSyncedStatusRef.current;
      if (last) {
        stopOrderActivity(last.orderId, {
          title: 'Commande terminée',
          subtitle: 'Belle parenthèse Teaven',
          progress: 1,
        }).catch(() => {});
        lastSyncedStatusRef.current = null;
      }
      return;
    }

    const isFinal = activeOrder.status === 'delivered'
      || activeOrder.status === 'cancelled'
      || activeOrder.status === 'returned';

    const subtitle = getWarmSubtitle(activeOrder.status, activeOrder.mode);
    const progress = activeOrder.progressPercent / 100;

    const last = lastSyncedStatusRef.current;
    const isNewOrder = !last || last.orderId !== activeOrder.orderId;
    const isStatusChange = last && last.orderId === activeOrder.orderId && last.status !== activeOrder.status;

    if (isFinal) {
      // Fin de la Live Activity
      stopOrderActivity(activeOrder.orderId, {
        title: activeOrder.statusLabel,
        subtitle,
        progress,
      }).catch(() => {});
      lastSyncedStatusRef.current = null;
    } else if (isNewOrder) {
      // Nouvelle commande → démarrer la Live Activity
      startOrderActivity({
        orderId: activeOrder.orderId,
        title: activeOrder.statusLabel,
        subtitle,
        progress,
      }).catch(() => {});
      lastSyncedStatusRef.current = { orderId: activeOrder.orderId, status: activeOrder.status };
    } else if (isStatusChange) {
      // Statut a changé → mise à jour
      updateOrderActivity({
        orderId: activeOrder.orderId,
        title: activeOrder.statusLabel,
        subtitle,
        progress,
      }).catch(() => {});
      lastSyncedStatusRef.current = { orderId: activeOrder.orderId, status: activeOrder.status };
    }
  }, [activeOrder]);

  return (
    <ActiveOrderContext.Provider value={{ activeOrder, dismiss, bannerHeight: activeOrder ? 64 : 0 }}>
      {children}
    </ActiveOrderContext.Provider>
  );
}
