// Types principaux de l'application Teaven

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // en centimes
  image: string;
  category: ProductCategory;
  rating: number;
  kcal: number;
  prepTime: number; // en minutes
  tags: string[];
  available: boolean;
}

export type ProductCategory = 'nourrir' | 'savourer' | 'emporter';

export interface Category {
  id: string;
  label: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
  loyaltyLevel: LoyaltyLevel;
  walletBalance: number; // en centimes
}

export type LoyaltyLevel = 'Bronze' | 'Argent' | 'Or' | 'Platine';

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number; // en centimes
  status: OrderStatus;
  createdAt: string;
  estimatedReadyAt: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export interface BlogArticle {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  readTime: number; // en minutes
  publishedAt: string;
}
