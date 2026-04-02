// Types principaux de l'application Teaven
// Tous les prix sont en centimes (integer)

// === UTILISATEUR ===
export interface User {
  id: string;
  phone: string;
  email?: string;
  fullName: string;
  squareCustomerId?: string;
  squareGiftCardId?: string;
  dietaryPreferences: string[];
  loyaltyPoints: number;
  loyaltyLevel: LoyaltyLevel;
  walletBalance: number; // centimes
  createdAt: string;
  updatedAt: string;
}

export type LoyaltyLevel = 'Première Parenthèse' | 'Habitude' | 'Rituel' | 'Sérénité' | 'Essentia';

// === PRODUIT ===
export type ProductCategory = 'nourrir' | 'savourer' | 'emporter' | 'patisseries';

export interface Category {
  id: string;
  label: string;
}

export interface Product {
  id: string;
  squareId?: string;
  name: string;
  description: string;
  price: number; // centimes (prix de base / première variation)
  image: string;
  category: ProductCategory;
  rating: number;
  kcal: number;
  prepTime: number; // minutes
  tags: string[];
  location: string;
  available: boolean;
  isNew?: boolean;
  isSeasonal?: boolean;
  isPopular?: boolean;
  orderedToday?: number;
  variations?: ProductVariation[];
  modifiers?: ModifierGroup[];
}

export interface ProductVariation {
  id: string;
  name: string;
  price: number; // centimes
  squareVariationId: string;
}

export interface ModifierGroup {
  id: string;
  label: string;
  type: 'single' | 'multiple';
  required?: boolean;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  label: string;
  price: number; // supplément en centimes (peut être 0)
  squareModifierId: string;
}

// === PANIER ===
export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariation?: ProductVariation;
  selectedModifiers?: { groupId: string; optionIds: string[] }[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}

// === COMMANDE ===
export type OrderStatus =
  | 'cart'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'order_created'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'incident';

export interface Order {
  id: string;
  userId: string;
  squareOrderId?: string;
  status: OrderStatus;
  mode: 'pickup'; // 'delivery' en Phase 2
  items: OrderItem[];
  subtotal: number;
  tax: number;
  loyaltyDiscount: number;
  total: number;
  pickupTime?: string;
  paymentMethod: 'card' | 'wallet' | 'mixed';
  squarePaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: SelectedModifier[];
}

// === BLOG ===
export interface BlogArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'nutrition' | 'bien-etre' | 'lifestyle';
  author: string;
  readTime: number;
  imageUrl: string;
  publishedAt: string;
  featured: boolean;
}

// === FIDÉLITÉ ===
export interface LoyaltyInfo {
  points: number;
  level: LoyaltyLevel;
  nextReward: string;
  progressPercent: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  expiresAt?: string;
  icon: string;
}

// === WALLET ===
export interface WalletInfo {
  balance: number; // centimes
  giftCardId?: string;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
}

// === ADRESSE (préparé pour Phase 2) ===
export interface Address {
  id: string;
  label: string; // "Maison", "Bureau"
  street: string;
  city: string;
  postalCode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}
