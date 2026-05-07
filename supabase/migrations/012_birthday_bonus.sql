-- ============================================================
-- 012 — Anniversaire client + bonus de fidélité one-shot
-- ============================================================
-- birthday : stocké au format ISO YYYY-MM-DD (Square attend ce format).
-- birthday_bonus_claimed_at : marqueur de la récompense one-shot accordée
-- la première fois que l'utilisateur renseigne son anniversaire.
-- L'année est conservée pour l'instant (pas de logique annuelle ici).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birthday DATE;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birthday_bonus_claimed_at TIMESTAMPTZ;
