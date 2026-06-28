# Changelog Teaven

Journal des changements par session. Chaque session Claude Code DOIT consigner
ici ce qu'elle a fait + les déploiements, et finir par un `git push`.

---

## Session 2026-06 — Livraison Uber Direct + paiement (branche `claude/fix-wallet-cart-onboarding-WJcWu`, PR #20)

### App (client)
- Wallet, panier (produits cliquables), TabBar Android, onboarding `/auth/register`,
  profil (section Aide & compte), bandeau anniversaire iOS.
- Profil : jauge de complétion + bonus, carte anniversaire (JJ/MM/AAAA) + bonus.
- Suivi livraison : carte Teaven (boutique + adresse + coursier live) **+ bouton
  « Suivre en direct » (page Uber)** ; pin destination alimenté par le serveur.
- `orderStore` : envoie l'adresse de livraison + le créneau au serveur (`scheduled_pickup_time`),
  remonte les erreurs Uber (`deliveryError`).

### Backend (Supabase — déployé)
- `create-order` v46 : fulfillment **PROPOSED** (exigé par Square) en type **PICKUP**
  (visible KDS) ; persiste `orders.delivery_address` ; **géocode l'adresse** (Google
  Places) ; ticket « Commande en livraison » (sans mention Uber/coursier).
- `process-payment` : transition fulfillment après paiement.
- `square-webhook` v37 (verify_jwt OFF) : **crée la livraison Uber Direct au paiement**
  (lit `delivery_address` + créneau), idempotent.
- `uber-direct-create-delivery` v26 : OAuth OK, **livraisons programmées** (pickup_ready_dt…),
  lit le créneau en base.
- `uber-direct-get-status` v23 : renvoie `tracking_url` + `dropoff_lat/lng`.
- `uber-direct-cancel` : annulation réelle côté Uber.
- Migration : colonne `orders.delivery_address` (jsonb).

### Secrets / config requis (Supabase Edge Function Secrets)
- `UBER_DIRECT_CLIENT_ID` (commence par `YO…`), `UBER_DIRECT_CLIENT_SECRET`,
  `UBER_DIRECT_CUSTOMER_ID` (UUID `d614…`), `UBER_DIRECT_SIGNING_KEY` — **OAuth validé OK**.
- `GOOGLE_PLACES_API_KEY` (géocodage adresse).

### ⚠️ Bloqueur connu
- L'**app installée (TestFlight)** est un build ancien qui **n'envoie pas encore
  l'adresse** au serveur → la livraison Uber ne peut pas se créer tant que l'app n'est
  pas rebuildée depuis cette branche. Le serveur est prêt.
- Refonte **carte/profil/stories** (session `claude/elated-nash-f7c7d0`) **non poussée
  sur GitHub** → voir `docs/OPS.md` §3 pour la récupération.

### À faire ensuite
1. Récupérer la branche `claude/elated-nash-f7c7d0` (refonte) — voir docs/OPS.md.
2. Fusionner refonte + ces fonctionnalités dans `main`.
3. Rebuild TestFlight depuis `main`.
