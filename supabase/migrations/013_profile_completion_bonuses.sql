-- Suivi des bonus de complétion de profil déjà attribués (idempotence).
-- Codes possibles : 'name', 'email', 'address'. Le bonus 'birthday' est géré
-- séparément via birthday_bonus_claimed_at (cf. migration 012).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_bonuses_claimed TEXT[] NOT NULL DEFAULT '{}';
