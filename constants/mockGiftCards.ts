// Cartes cadeaux mock — montants en centimes

export interface GiftCardTemplate {
  id: string;
  amount: number; // centimes
  label: string;
  color: string; // couleur de départ du dégradé
}

export const giftCardAmounts: GiftCardTemplate[] = [
  { id: '1', amount: 1500, label: '15 €', color: '#75967F' },
  { id: '2', amount: 2500, label: '25 €', color: '#738478' },
  { id: '3', amount: 5000, label: '50 €', color: '#4A6B50' },
  { id: 'custom', amount: 0, label: 'Personnalisé', color: '#2A2A2A' },
];
