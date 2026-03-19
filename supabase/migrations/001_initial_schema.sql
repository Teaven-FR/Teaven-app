-- Teaven — Schema initial
-- Tables : products, orders, profiles, loyalty_transactions

-- ============================================================
-- PRODUCTS — Catalogue synchronisé depuis Square
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_id TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0, -- en centimes
  category TEXT NOT NULL DEFAULT 'savourer',
  image TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 4.5,
  kcal INTEGER DEFAULT 0,
  prep_time INTEGER DEFAULT 10, -- en minutes
  available BOOLEAN DEFAULT true,
  location TEXT DEFAULT 'Franconville',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_available ON products(available);
CREATE INDEX idx_products_square_id ON products(square_id);

-- ============================================================
-- PROFILES — Extension de auth.users
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  loyalty_points INTEGER DEFAULT 0,
  loyalty_level TEXT DEFAULT 'Bronze', -- Bronze, Argent, Or, Platine
  wallet_balance INTEGER DEFAULT 0, -- en centimes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_phone ON profiles(phone);

-- ============================================================
-- ORDERS — Commandes liées à Square
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  square_order_id TEXT UNIQUE,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount INTEGER NOT NULL DEFAULT 0, -- en centimes
  items JSONB NOT NULL DEFAULT '[]',
  pickup_time TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_square_id ON orders(square_order_id);

-- ============================================================
-- LOYALTY_TRANSACTIONS — Historique des points fidélité
-- ============================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL, -- positif = gagné, négatif = dépensé
  reason TEXT NOT NULL, -- 'purchase', 'redemption', 'bonus', 'welcome'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_loyalty_user_id ON loyalty_transactions(user_id);

-- ============================================================
-- BLOG_ARTICLES — Articles du blog Atmosphère
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  image TEXT DEFAULT '',
  category TEXT DEFAULT 'Bien-être',
  read_time INTEGER DEFAULT 5,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

-- Products : lecture publique
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT USING (true);

-- Profiles : chaque user voit/modifie son profil
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Orders : chaque user voit ses commandes
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Loyalty : chaque user voit son historique
CREATE POLICY "Users can view their own loyalty transactions"
  ON loyalty_transactions FOR SELECT USING (auth.uid() = user_id);

-- Blog : lecture publique pour les articles publiés
CREATE POLICY "Published articles are viewable by everyone"
  ON blog_articles FOR SELECT USING (published = true);

-- ============================================================
-- FUNCTIONS — Triggers automatiques
-- ============================================================

-- Créer un profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, phone, loyalty_points, loyalty_level)
  VALUES (NEW.id, NEW.phone, 50, 'Bronze'); -- 50 points de bienvenue

  -- Logger la transaction de bienvenue
  INSERT INTO loyalty_transactions (user_id, points, reason)
  VALUES (NEW.id, 50, 'welcome');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
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

CREATE OR REPLACE TRIGGER on_loyalty_points_change
  AFTER UPDATE OF loyalty_points ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_loyalty_level();
