-- Chantier G — Progression Parenthèses
CREATE TABLE IF NOT EXISTS loyalty_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  total_parentheses INTEGER DEFAULT 0,
  current_level TEXT DEFAULT 'premiere_parenthese',
  streak_weeks INTEGER DEFAULT 0,
  last_order_week DATE,
  level_up_pending BOOLEAN DEFAULT false,
  level_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loyalty_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own loyalty progress" ON loyalty_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own loyalty progress" ON loyalty_progress FOR UPDATE USING (auth.uid() = user_id);

-- Chantier H — Livraisons Uber Direct
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  uber_delivery_id TEXT,
  status TEXT DEFAULT 'pending',
  courier_name TEXT,
  courier_phone TEXT,
  courier_vehicle TEXT,
  tracking_url TEXT,
  estimated_pickup_at TIMESTAMPTZ,
  estimated_dropoff_at TIMESTAMPTZ,
  actual_pickup_at TIMESTAMPTZ,
  actual_dropoff_at TIMESTAMPTZ,
  pickup_address JSONB,
  dropoff_address JSONB,
  fee_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own deliveries" ON deliveries FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND orders.user_id = auth.uid())
);

-- Adresses de livraison
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  label TEXT DEFAULT 'Maison',
  street TEXT NOT NULL,
  complement TEXT,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  instructions TEXT,
  lat FLOAT,
  lng FLOAT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own addresses" ON addresses FOR ALL USING (auth.uid() = user_id);

-- Avis post-commande
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 4),
  comment TEXT,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT USING (auth.uid() = user_id);

-- Chantier I — Instagram posts cache
CREATE TABLE IF NOT EXISTS instagram_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_post_id TEXT UNIQUE,
  image_url TEXT NOT NULL,
  post_url TEXT NOT NULL,
  caption TEXT,
  posted_at TIMESTAMPTZ,
  cached_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read instagram posts" ON instagram_posts FOR SELECT USING (true);

-- Chantier F — Stories produit
CREATE TABLE IF NOT EXISTS product_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_item_id TEXT NOT NULL,
  fact_text TEXT,
  origin_text TEXT,
  preparation_text TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read product stories" ON product_stories FOR SELECT USING (true);
