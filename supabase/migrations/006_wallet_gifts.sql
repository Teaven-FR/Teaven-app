-- ✅ CHANTIER 6 — Table wallet_gifts pour le système "Offrir un moment"
-- Stocke les cadeaux envoyés via wallet (Square Gift Cards)

CREATE TABLE IF NOT EXISTS wallet_gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id),
  recipient_phone TEXT NOT NULL,
  amount INTEGER NOT NULL,          -- en centimes
  message TEXT DEFAULT '',
  gift_card_id TEXT,                 -- Square Gift Card ID
  code TEXT UNIQUE,                  -- Code formaté type TEAVEN-XXXX
  moment_name TEXT,                  -- "Une pause sucrée", "Un brunch", etc.
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES auth.users(id)
);

-- Index pour la recherche par code
CREATE INDEX IF NOT EXISTS idx_wallet_gifts_code ON wallet_gifts(code);
CREATE INDEX IF NOT EXISTS idx_wallet_gifts_recipient ON wallet_gifts(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_wallet_gifts_sender ON wallet_gifts(sender_id);

-- RLS
ALTER TABLE wallet_gifts ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les gifts qu'ils ont envoyés
CREATE POLICY "Users can view own sent gifts"
  ON wallet_gifts FOR SELECT
  USING (auth.uid() = sender_id);

-- Les utilisateurs peuvent voir les gifts qui leur sont destinés (via phone match)
CREATE POLICY "Users can view received gifts"
  ON wallet_gifts FOR SELECT
  USING (
    recipient_phone IN (
      SELECT phone FROM auth.users WHERE id = auth.uid()
    )
  );

-- Seul le service role peut insérer/modifier (via Edge Functions)
CREATE POLICY "Service role full access"
  ON wallet_gifts FOR ALL
  USING (auth.role() = 'service_role');
