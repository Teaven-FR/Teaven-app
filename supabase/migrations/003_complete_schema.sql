-- Migration 003 — Schéma complet Teaven App
-- Ajoute les tables manquantes et enrichit les existantes
-- À exécuter après 001_initial_schema.sql et 002_catalog_enhancements.sql

-- ============================================================
-- PROFILES — Enrichir avec les nouveaux champs
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS square_customer_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS square_gift_card_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dietary_preferences JSONB DEFAULT '[]'::jsonb;

-- ============================================================
-- ADDRESSES — Adresses utilisateur (Phase 2 livraison)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- ============================================================
-- CATALOG_CACHE — Cache du catalogue Square (alternative rapide)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.catalog_cache (
  square_item_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  price INTEGER NOT NULL, -- centimes
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
-- ORDERS — Enrichir avec les colonnes détaillées
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS subtotal INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_discount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
  ADD COLUMN IF NOT EXISTS square_payment_id VARCHAR(100);

-- ============================================================
-- ORDER_ITEMS — Articles de commande normalisés
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  modifiers JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ============================================================
-- DELIVERIES — Livraisons (Phase 2)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
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
-- BLOG_ARTICLES — Enrichir
-- ============================================================
ALTER TABLE public.blog_articles
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS author VARCHAR(100),
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON public.blog_articles(category);
CREATE INDEX IF NOT EXISTS idx_blog_articles_featured ON public.blog_articles(is_featured);

-- ============================================================
-- WALLET_TRANSACTIONS — Historique du porte-monnaie
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  type VARCHAR(10) NOT NULL, -- 'credit' ou 'debit'
  amount INTEGER NOT NULL, -- centimes
  description VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);

-- ============================================================
-- ORDER_STATUS_LOG — Audit trail des statuts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by VARCHAR(50) DEFAULT 'system'
);

-- ============================================================
-- RLS — Nouvelles tables
-- ============================================================
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own addresses" ON public.addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view own wallet" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Catalog cache is public" ON public.catalog_cache
  FOR SELECT USING (true);

-- ============================================================
-- FUNCTIONS — Wallet helpers
-- ============================================================
CREATE OR REPLACE FUNCTION increment_wallet(user_id UUID, add_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + add_amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_wallet(user_id UUID, sub_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET wallet_balance = GREATEST(wallet_balance - sub_amount, 0),
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER — updated_at automatique
-- ============================================================
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
    CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'deliveries_updated_at') THEN
    CREATE TRIGGER deliveries_updated_at BEFORE UPDATE ON public.deliveries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END;
$$;
