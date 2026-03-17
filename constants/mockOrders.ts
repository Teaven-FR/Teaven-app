// Commandes mock pour l'historique du profil
import { mockProducts } from '@/constants/mockData';
import type { Product } from '@/lib/types';

export interface MockOrder {
  id: string;
  date: string;
  items: { product: Product; quantity: number }[];
  total: number; // en centimes
  status: 'completed' | 'preparing' | 'ready' | 'cancelled';
}

export const mockOrders: MockOrder[] = [
  {
    id: 'ORD-001',
    date: '15 mars 2026',
    items: [
      { product: mockProducts[0], quantity: 1 }, // Zen Buddha Bowl
      { product: mockProducts[1], quantity: 2 }, // Matcha Zen Latte ×2
    ],
    total: 2750,
    status: 'completed',
  },
  {
    id: 'ORD-002',
    date: '12 mars 2026',
    items: [
      { product: mockProducts[4], quantity: 1 }, // Smoothie Vert Détox
    ],
    total: 650,
    status: 'completed',
  },
  {
    id: 'ORD-003',
    date: '8 mars 2026',
    items: [
      { product: mockProducts[2], quantity: 1 }, // Salade Printanière
      { product: mockProducts[3], quantity: 1 }, // Earl Grey Bio
    ],
    total: 1770,
    status: 'completed',
  },
  {
    id: 'ORD-004',
    date: '3 mars 2026',
    items: [
      { product: mockProducts[0], quantity: 2 }, // Zen Buddha Bowl ×2
      { product: mockProducts[5], quantity: 1 }, // Sencha Japon
    ],
    total: 3350,
    status: 'completed',
  },
  {
    id: 'ORD-005',
    date: '28 février 2026',
    items: [
      { product: mockProducts[1], quantity: 1 }, // Matcha Zen Latte
      { product: mockProducts[4], quantity: 1 }, // Smoothie Vert Détox
    ],
    total: 1300,
    status: 'completed',
  },
];
