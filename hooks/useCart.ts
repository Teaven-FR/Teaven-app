// Hook panier — wrapper autour du store Zustand
import { useCartStore } from '@/stores/cartStore';

export function useCart() {
  const store = useCartStore();

  /** Formater un prix en centimes vers euros */
  const formatPrice = (cents: number): string => {
    return (cents / 100).toFixed(2).replace('.', ',') + ' €';
  };

  return {
    items: store.items,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    totalItems: store.totalItems(),
    totalPrice: store.totalPrice(),
    formattedTotal: formatPrice(store.totalPrice()),
    formatPrice,
  };
}
