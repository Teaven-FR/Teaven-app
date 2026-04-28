-- Migration : Wallet — Square = source de vérité unique
-- Date : 2026-04-21
-- Contexte : rollback doctrinal du commit 21767e2 qui avait basculé Supabase en source
--   de vérité. Après audit Consortium Produit, on réaffirme : Square Gift Cards API
--   est la source unique du solde wallet. Supabase conserve uniquement la référence
--   (square_gift_card_id) et l'historique (wallet_transactions, append-only).
--
-- Cette migration :
--   1. Supprime les RPC `increment_wallet` / `decrement_wallet` qui permettaient
--      des écritures directes sur le solde Supabase.
--   2. Documente `profiles.wallet_balance` comme cache déprécié (à terme : supprimer).
--      Pour l'instant on garde la colonne pour compatibilité descendante côté lecture,
--      mais plus rien ne doit l'écrire côté code (enforcement côté edge functions).

BEGIN;

-- 1. Suppression des RPC d'écriture de solde
DROP FUNCTION IF EXISTS increment_wallet(UUID, INTEGER);
DROP FUNCTION IF EXISTS decrement_wallet(UUID, INTEGER);

-- 2. Documentation : wallet_balance est un cache, pas une source
COMMENT ON COLUMN profiles.wallet_balance IS
  'DEPRECATED CACHE. Source de vérité = Square Gift Card balance_money. '
  'Ne plus écrire cette colonne. Les edge functions process-recharge, process-payment '
  'et manage-wallet lisent/écrivent directement via Square Gift Cards API.';

COMMENT ON COLUMN profiles.square_gift_card_id IS
  'Référence vers la gift card Square canonique du client (1 carte par client). '
  'Géré par l''edge function ensure-gift-card. Ne pas modifier manuellement.';

COMMIT;
