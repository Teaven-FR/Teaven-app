-- Année du dernier anniversaire fêté côté app (push + cadeau wallet).
-- Empêche le cron J-0 de re-tirer le cadeau si l'utilisateur change son anniv.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_birthday_celebrated_year INTEGER;
