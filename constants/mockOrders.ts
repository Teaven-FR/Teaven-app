// Commandes mock pour l'historique du profil
import { mockProducts } from '@/constants/mockData';
import type { Product } from '@/lib/types';

export interface MockOrder {
  id: string;
  orderNumber: string; // Numéro affiché au client (ex: "#T-2847")
  date: string;
  items: { product: Product; quantity: number }[];
  total: number; // en centimes
  status: 'completed' | 'preparing' | 'ready' | 'cancelled';
}

export const mockOrders: MockOrder[] = [
  {
    id: 'ORD-001',
    orderNumber: '#T-2847',
    date: '20 mars 2026',
    items: [
      { product: mockProducts[0], quantity: 1 }, // Zen Buddha Bowl
      { product: mockProducts[1], quantity: 2 }, // Matcha Zen Latte ×2
    ],
    total: 2750,
    status: 'ready',
  },
  {
    id: 'ORD-002',
    orderNumber: '#T-2845',
    date: '20 mars 2026',
    items: [
      { product: mockProducts[4], quantity: 1 }, // Smoothie Vert Détox
      { product: mockProducts[6], quantity: 1 }, // Carrot Cake Maison
    ],
    total: 1240,
    status: 'preparing',
  },
  {
    id: 'ORD-003',
    orderNumber: '#T-2839',
    date: '18 mars 2026',
    items: [
      { product: mockProducts[2], quantity: 1 }, // Salade Printanière
      { product: mockProducts[3], quantity: 1 }, // Earl Grey Bio
    ],
    total: 1770,
    status: 'completed',
  },
  {
    id: 'ORD-004',
    orderNumber: '#T-2831',
    date: '15 mars 2026',
    items: [
      { product: mockProducts[0], quantity: 2 }, // Zen Buddha Bowl ×2
      { product: mockProducts[5], quantity: 1 }, // Sencha Japon
    ],
    total: 3350,
    status: 'completed',
  },
  {
    id: 'ORD-005',
    orderNumber: '#T-2820',
    date: '10 mars 2026',
    items: [
      { product: mockProducts[1], quantity: 1 }, // Matcha Zen Latte
      { product: mockProducts[10], quantity: 1 }, // Poke Bowl Saumon
    ],
    total: 2240,
    status: 'completed',
  },
];
