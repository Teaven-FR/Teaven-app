-- Teaven — Migration 002 : Support variations, modificateurs et catégories Square
-- Tables : product_variations, modifier_groups, modifier_options, categories

-- ============================================================
-- CATEGORIES — Catégories synchronisées depuis Square
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_category_id TEXT UNIQUE,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  ordinal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insérer la catégorie "Tout" par défaut (pas dans Square)
INSERT INTO categories (slug, label, ordinal)
VALUES ('all', 'Tout', 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PRODUCT_VARIATIONS — Tailles / variantes d'un produit
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  square_variation_id TEXT UNIQUE,
  name TEXT NOT NULL DEFAULT 'Standard',
  price INTEGER NOT NULL DEFAULT 0, -- en centimes
  ordinal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_variations_product ON product_variations(product_id);
CREATE INDEX idx_product_variations_square ON product_variations(square_variation_id);

-- ============================================================
-- MODIFIER_GROUPS — Groupes de modificateurs (ex: Taille, Suppléments)
-- ============================================================
CREATE TABLE IF NOT EXISTS modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  square_modifier_list_id TEXT,
  label TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'single', -- 'single' ou 'multiple'
  ordinal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_modifier_groups_product ON modifier_groups(product_id);

-- ============================================================
-- MODIFIER_OPTIONS — Options individuelles d'un groupe
-- ============================================================
CREATE TABLE IF NOT EXISTS modifier_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  square_modifier_id TEXT UNIQUE,
  label TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0, -- supplément en centimes
  ordinal INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_modifier_options_group ON modifier_options(group_id);

-- ============================================================
-- Ajouter square_image_url à products (URL résolue depuis Square)
-- ============================================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS square_image_url TEXT DEFAULT '';

-- ============================================================
-- RLS pour les nouvelles tables
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier_options ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour le catalogue
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Variations are viewable by everyone"
  ON product_variations FOR SELECT USING (true);

CREATE POLICY "Modifier groups are viewable by everyone"
  ON modifier_groups FOR SELECT USING (true);

CREATE POLICY "Modifier options are viewable by everyone"
  ON modifier_options FOR SELECT USING (true);
