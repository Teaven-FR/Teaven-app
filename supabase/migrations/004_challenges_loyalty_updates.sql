-- Migration 004 : Challenges system + loyalty columns update

-- ─── Colonnes manquantes sur profiles ────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS square_loyalty_account_id VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS orders_since_last_reward INTEGER DEFAULT 0;

-- ─── Table des défis ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,  -- 'streak' | 'frequency' | 'category' | 'amount' | 'first_action' | 'wallet'
  target_value INTEGER NOT NULL,
  target_category TEXT,
  reward_points INTEGER NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_recurring BOOLEAN DEFAULT false,
  recurrence TEXT, -- 'weekly' | 'monthly' | null
  difficulty TEXT DEFAULT 'medium', -- 'easy' | 'medium' | 'hard'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read challenges" ON challenges FOR SELECT USING (true);

-- ─── Table de progression des défis par utilisateur ──────────────────────────
CREATE TABLE IF NOT EXISTS challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  challenge_id UUID REFERENCES challenges(id) NOT NULL,
  current_value INTEGER DEFAULT 0,
  last_increment_date DATE,
  streak_current INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  points_awarded BOOLEAN DEFAULT false,
  UNIQUE(user_id, challenge_id)
);

ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own progress" ON challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage progress" ON challenge_progress FOR ALL USING (true);

-- ─── Index pour performance ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active) WHERE is_active = true;

-- ─── Insérer les 8 premiers défis ───────────────────────────────────────────
INSERT INTO challenges (title, description, type, target_value, reward_points, difficulty, is_recurring, recurrence, is_active) VALUES
  ('Série de 3', 'Commander 3 jours consécutifs', 'streak', 3, 200, 'easy', true, 'weekly', true),
  ('Série de 5', 'Commander 5 jours consécutifs', 'streak', 5, 500, 'medium', true, 'weekly', true),
  ('3 commandes cette semaine', 'Passer 3 commandes cette semaine', 'frequency', 3, 200, 'easy', true, 'weekly', true),
  ('Découverte Matcha', 'Commander un produit matcha', 'category', 1, 100, 'easy', true, 'weekly', true),
  ('Rituel du matin', 'Commander 3 fois avant 11h', 'frequency', 3, 300, 'medium', true, 'weekly', true),
  ('Rechargez votre wallet', 'Recharger 30€ ou plus', 'wallet', 3000, 150, 'easy', true, 'weekly', true),
  ('Premier parrainage', 'Parrainer un ami', 'first_action', 1, 200, 'medium', false, null, true),
  ('Marathonien', 'Passer 10 commandes ce mois', 'frequency', 10, 800, 'hard', true, 'monthly', true)
ON CONFLICT DO NOTHING;
