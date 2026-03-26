// ✅ CHANTIER 4 — Adresse dynamique depuis Square Locations API
// Hook pour récupérer les données du restaurant (nom, adresse, horaires)
// Les données sont récupérées via l'Edge Function get-business-hours qui appelle Square GET /v2/locations
import { useState, useEffect } from 'react';

const SUPA_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPA_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export interface LocationData {
  name: string;
  addressFormatted: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    postalCode: string;
    country: string;
  };
  open: number;
  close: number;
  closed: boolean;
}

// Cache en mémoire pour éviter de refetcher à chaque montage
let cachedLocation: LocationData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

const FALLBACK: LocationData = {
  name: 'Teaven',
  addressFormatted: '',
  address: { line1: '', line2: '', city: '', postalCode: '', country: 'FR' },
  open: 9,
  close: 20,
  closed: false,
};

export function useLocation() {
  const [location, setLocation] = useState<LocationData>(cachedLocation ?? FALLBACK);
  const [loading, setLoading] = useState(!cachedLocation);

  useEffect(() => {
    // Utiliser le cache s'il est encore valide
    if (cachedLocation && Date.now() - cacheTimestamp < CACHE_TTL) {
      setLocation(cachedLocation);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SUPA_URL}/functions/v1/get-business-hours`, {
          headers: { 'Authorization': `Bearer ${SUPA_KEY}`, 'apikey': SUPA_KEY },
        });
        const data = await res.json();
        if (cancelled) return;

        const loc: LocationData = {
          name: data.location_name ?? 'Teaven',
          addressFormatted: data.addressFormatted ?? '',
          address: data.address ?? FALLBACK.address,
          open: data.open ?? 9,
          close: data.close ?? 20,
          closed: data.closed ?? false,
        };

        cachedLocation = loc;
        cacheTimestamp = Date.now();
        setLocation(loc);
      } catch {
        // Keep fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { location, loading };
}
