-- Migration 010 : Défis réels Mai 2026
-- Remplace les défis placeholder par les 5 vrais défis de lancement

-- ─── Nouvelles colonnes sur challenges ──────────────────────────────────────
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'trophy';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS ui_category TEXT DEFAULT 'fidelite';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS prerequisite_challenge_id UUID REFERENCES challenges(id);

-- ─── Nouvelle colonne sur challenge_progress ────────────────────────────────
-- Stocke les noms/IDs des produits distincts déjà comptés (pour category_distinct)
ALTER TABLE challenge_progress ADD COLUMN IF NOT EXISTS distinct_items JSONB DEFAULT '[]';

-- ─── Désactiver tous les anciens défis placeholder ──────────────────────────
UPDATE challenges SET is_active = false;

-- ─── Insérer les 5 défis réels Mai 2026 ────────────────────────────────────

-- 1. Fidèle du matin — récurrent, bonus à chaque commande avant 11h
INSERT INTO challenges (title, description, type, target_value, target_category, reward_points, difficulty, is_recurring, recurrence, is_active, icon, ui_category)
VALUES (
  'Fidèle du matin',
  'Commandez avant 11h et gagnez des points à chaque commande matinale',
  'morning_bonus',
  1,
  NULL,
  50,
  'easy',
  true,
  NULL,
  true,
  'flame',
  'fidelite'
);

-- 2. Découverte Matcha — Niveau 1 (one-shot)
INSERT INTO challenges (title, description, type, target_value, target_category, reward_points, difficulty, is_recurring, recurrence, is_active, icon, ui_category)
VALUES (
  'Découverte Matcha — Niveau 1',
  'Commandez votre premier matcha',
  'category',
  1,
  'matcha',
  100,
  'easy',
  false,
  NULL,
  true,
  'coffee',
  'boissons'
);

-- 3. Découverte Matcha — Niveau 2 (progressif, prérequis: Niv 1)
INSERT INTO challenges (title, description, type, target_value, target_category, reward_points, difficulty, is_recurring, recurrence, is_active, icon, ui_category, prerequisite_challenge_id)
VALUES (
  'Découverte Matcha — Niveau 2',
  'Explorez la carte : commandez 3 matchas différents',
  'category_distinct',
  3,
  'matcha',
  300,
  'medium',
  false,
  NULL,
  true,
  'coffee',
  'boissons',
  (SELECT id FROM challenges WHERE title = 'Découverte Matcha — Niveau 1' AND is_active = true LIMIT 1)
);

-- 4. Challenge du mois — Pâtisserie (progressif, reset mensuel)
INSERT INTO challenges (title, description, type, target_value, target_category, reward_points, difficulty, is_recurring, recurrence, is_active, icon, ui_category)
VALUES (
  'Challenge du mois — Pâtisserie',
  'Commandez 3 pâtisseries différentes ce mois-ci',
  'category_distinct',
  3,
  'patisserie',
  200,
  'medium',
  true,
  'monthly',
  true,
  'heart',
  'food'
);

-- 5. Ambassadeur Social (récurrent, chaque parrainage)
INSERT INTO challenges (title, description, type, target_value, target_category, reward_points, difficulty, is_recurring, recurrence, is_active, icon, ui_category)
VALUES (
  'Ambassadeur Social',
  'Parrainez un ami : invitez un proche qui crée son compte',
  'referral',
  1,
  NULL,
  500,
  'medium',
  true,
  NULL,
  true,
  'users',
  'social'
);
