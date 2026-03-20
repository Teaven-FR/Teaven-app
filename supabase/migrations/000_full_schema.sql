-- ============================================================
-- TEAVEN — Schéma complet (migrations 001 + 002 + 003 combinées)
-- À exécuter dans le SQL Editor de Supabase Dashboard
-- ============================================================

-- ============================================================
-- 1. PRODUCTS — Catalogue synchronisé depuis Square
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'savourer',
  image TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 4.5,
  kcal INTEGER DEFAULT 0,
  prep_time INTEGER DEFAULT 10,
  available BOOLEAN DEFAULT true,
  location TEXT DEFAULT 'Franconville',
  square_image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available);
CREATE INDEX IF NOT EXISTS idx_products_square_id ON products(square_id);

-- ============================================================
-- 2. PROFILES — Extension de auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email VARCHAR(255),
  full_name VARCHAR(255),
  square_customer_id VARCHAR(100),
  square_gift_card_id VARCHAR(100),
  dietary_preferences JSONB DEFAULT '[]'::jsonb,
  loyalty_points INTEGER DEFAULT 0,
  loyalty_level TEXT DEFAULT 'Bronze',
  wallet_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- ============================================================
-- 3. CATEGORIES — Catégories synchronisées depuis Square
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_category_id TEXT UNIQUE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  ordinal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO categories (slug, label, ordinal)
VALUES ('all', 'Tout', 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. PRODUCT_VARIATIONS — Tailles / variantes d'un produit
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  square_variation_id TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT 'Standard',
  price INTEGER NOT NULL DEFAULT 0,
  ordinal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_variations_product ON product_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variations_square ON product_variations(square_variation_id);

-- ============================================================
-- 5. MODIFIER_GROUPS — Groupes de modificateurs
-- ============================================================
CREATE TABLE IF NOT EXISTS modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  square_modifier_list_id TEXT UNIQUE,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single',
  ordinal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modifier_groups_product ON modifier_groups(product_id);

-- ============================================================
-- 6. MODIFIER_OPTIONS — Options individuelles d'un groupe
-- ============================================================
CREATE TABLE IF NOT EXISTS modifier_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  square_modifier_id TEXT UNIQUE,
  label TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  ordinal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modifier_options_group ON modifier_options(group_id);

-- ============================================================
-- 7. ORDERS — Commandes liées à Square
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  square_order_id TEXT UNIQUE,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount INTEGER NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]',
  mode VARCHAR(20) DEFAULT 'pickup',
  subtotal INTEGER DEFAULT 0,
  tax INTEGER DEFAULT 0,
  loyalty_discount INTEGER DEFAULT 0,
  payment_method VARCHAR(20),
  square_payment_id VARCHAR(100),
  pickup_time TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_square_id ON orders(square_order_id);

-- ============================================================
-- 8. ORDER_ITEMS — Articles de commande normalisés
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  modifiers JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- 9. LOYALTY_TRANSACTIONS — Historique des points fidélité
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_user_id ON loyalty_transactions(user_id);

-- ============================================================
-- 10. WALLET_TRANSACTIONS — Historique du porte-monnaie
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type VARCHAR(10) NOT NULL,
  amount INTEGER NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);

-- ============================================================
-- 11. BLOG_ARTICLES — Articles du blog
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug VARCHAR(255) UNIQUE,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  image TEXT DEFAULT '',
  cover_image_url VARCHAR(500),
  author VARCHAR(100),
  category TEXT DEFAULT 'Bien-être',
  read_time INTEGER DEFAULT 5,
  is_featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON blog_articles(category);
CREATE INDEX IF NOT EXISTS idx_blog_articles_featured ON blog_articles(is_featured);

-- ============================================================
-- 12. ADDRESSES — Adresses utilisateur (Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- ============================================================
-- 13. DELIVERIES — Livraisons (Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(50),
  provider_delivery_id VARCHAR(100),
  status VARCHAR(50),
  courier_name VARCHAR(100),
  courier_phone VARCHAR(20),
  estimated_pickup TIMESTAMPTZ,
  estimated_dropoff TIMESTAMPTZ,
  tracking_url VARCHAR(500),
  proof_of_delivery VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. ORDER_STATUS_LOG — Audit trail des statuts
-- ============================================================
CREATE TABLE IF NOT EXISTS order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by VARCHAR(50) DEFAULT 'system'
);

-- ============================================================
-- 15. CATALOG_CACHE — Cache du catalogue Square
-- ============================================================
CREATE TABLE IF NOT EXISTS catalog_cache (
  square_item_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  price INTEGER NOT NULL,
  image_url VARCHAR(500),
  nutritional_info JSONB,
  modifiers JSONB,
  tags JSONB DEFAULT '[]'::jsonb,
  is_available BOOLEAN DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0,
  prep_time INTEGER DEFAULT 15,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_log ENABLE ROW LEVEL SECURITY;

-- Lecture publique : catalogue
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Products are viewable by everyone' AND tablename = 'products') THEN
    CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Categories are viewable by everyone' AND tablename = 'categories') THEN
    CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Variations are viewable by everyone' AND tablename = 'product_variations') THEN
    CREATE POLICY "Variations are viewable by everyone" ON product_variations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Modifier groups are viewable by everyone' AND tablename = 'modifier_groups') THEN
    CREATE POLICY "Modifier groups are viewable by everyone" ON modifier_groups FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Modifier options are viewable by everyone' AND tablename = 'modifier_options') THEN
    CREATE POLICY "Modifier options are viewable by everyone" ON modifier_options FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Catalog cache is public' AND tablename = 'catalog_cache') THEN
    CREATE POLICY "Catalog cache is public" ON catalog_cache FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Published articles are viewable by everyone' AND tablename = 'blog_articles') THEN
    CREATE POLICY "Published articles are viewable by everyone" ON blog_articles FOR SELECT USING (published = true);
  END IF;

  -- Profils : chaque user voit/modifie son profil
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;

  -- Commandes : chaque user voit ses commandes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own orders' AND tablename = 'orders') THEN
    CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own orders' AND tablename = 'orders') THEN
    CREATE POLICY "Users can insert their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Order items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own order items' AND tablename = 'order_items') THEN
    CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );
  END IF;

  -- Fidélité
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own loyalty transactions' AND tablename = 'loyalty_transactions') THEN
    CREATE POLICY "Users can view their own loyalty transactions" ON loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Wallet
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own wallet' AND tablename = 'wallet_transactions') THEN
    CREATE POLICY "Users can view own wallet" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Adresses
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own addresses' AND tablename = 'addresses') THEN
    CREATE POLICY "Users can manage own addresses" ON addresses FOR ALL USING (auth.uid() = user_id);
  END IF;

  -- Orders : UPDATE (pour les mises à jour de statut via webhook/payment — service role bypass RLS)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own orders' AND tablename = 'orders') THEN
    CREATE POLICY "Users can update their own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Order items : INSERT (pour les Edge Functions — service role bypass RLS)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own order items' AND tablename = 'order_items') THEN
    CREATE POLICY "Users can insert own order items" ON order_items FOR INSERT WITH CHECK (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );
  END IF;

  -- Wallet transactions : INSERT
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own wallet transactions' AND tablename = 'wallet_transactions') THEN
    CREATE POLICY "Users can insert own wallet transactions" ON wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Loyalty transactions : INSERT
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own loyalty transactions' AND tablename = 'loyalty_transactions') THEN
    CREATE POLICY "Users can insert own loyalty transactions" ON loyalty_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Deliveries : SELECT
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own deliveries' AND tablename = 'deliveries') THEN
    CREATE POLICY "Users can view own deliveries" ON deliveries FOR SELECT USING (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );
  END IF;

  -- Order status log : SELECT
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own order status log' AND tablename = 'order_status_log') THEN
    CREATE POLICY "Users can view own order status log" ON order_status_log FOR SELECT USING (
      order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
    );
  END IF;
END $$;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Créer un profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, phone, loyalty_points, loyalty_level)
  VALUES (NEW.id, NEW.phone, 50, 'Bronze');

  INSERT INTO loyalty_transactions (user_id, points, reason)
  VALUES (NEW.id, 50, 'welcome');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Mettre à jour le niveau fidélité automatiquement
CREATE OR REPLACE FUNCTION update_loyalty_level()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET
    loyalty_level = CASE
      WHEN NEW.loyalty_points >= 1000 THEN 'Platine'
      WHEN NEW.loyalty_points >= 500 THEN 'Or'
      WHEN NEW.loyalty_points >= 200 THEN 'Argent'
      ELSE 'Bronze'
    END,
    updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_loyalty_points_change ON profiles;
CREATE TRIGGER on_loyalty_points_change
  AFTER UPDATE OF loyalty_points ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_loyalty_level();

-- Wallet helpers
CREATE OR REPLACE FUNCTION increment_wallet(user_id UUID, add_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = wallet_balance + add_amount, updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_wallet(user_id UUID, sub_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET wallet_balance = GREATEST(wallet_balance - sub_amount, 0), updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'orders_updated_at') THEN
    CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deliveries_updated_at') THEN
    CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON deliveries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END;
$$;

-- Index supplémentaires pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_square_customer_id ON profiles(square_customer_id);
CREATE INDEX IF NOT EXISTS idx_order_status_log_order_id ON order_status_log(order_id);
