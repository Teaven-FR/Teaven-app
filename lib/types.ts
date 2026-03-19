// Types principaux de l'application Teaven

export interface ProductVariation {
  id: string;
  name: string;
  price: number; // en centimes
  squareVariationId: string;
}

export interface ModifierOption {
  id: string;
  label: string;
  price: number; // supplément en centimes
  squareModifierId: string;
}

export interface ModifierGroup {
  id: string;
  label: string;
  type: 'single' | 'multiple';
  options: ModifierOption[];
}

export interface Product {
  id: string;
  squareId?: string;
  name: string;
  description: string;
  price: number; // en centimes (prix de base / première variation)
  image: string;
  category: ProductCategory;
  rating: number;
  kcal: number;
  prepTime: number; // en minutes
  tags: string[];
  location: string;
  available: boolean;
  variations?: ProductVariation[];
  modifiers?: ModifierGroup[];
}

export type ProductCategory = 'nourrir' | 'savourer' | 'emporter' | 'patisseries';

export interface Category {
  id: string;
  label: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariation?: ProductVariation;
  selectedModifiers?: { groupId: string; optionIds: string[] }[];
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
