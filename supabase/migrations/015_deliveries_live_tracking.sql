-- 015 — Tracking livraison live : colonnes manquantes sur deliveries
-- Le webhook Uber écrivait courier_vehicle / actual_*_at / estimated_dropoff_at
-- qui n'existaient pas → updates silencieusement perdus. On aligne le schéma
-- et on ajoute la position temps réel du livreur (courier_lat/lng) pour la
-- carte de suivi (fini la position simulée côté app).

alter table public.deliveries
  add column if not exists courier_vehicle varchar,
  add column if not exists courier_lat double precision,
  add column if not exists courier_lng double precision,
  add column if not exists actual_pickup_at timestamptz,
  add column if not exists actual_dropoff_at timestamptz;
