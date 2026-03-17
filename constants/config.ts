// Configuration Teaven — clés publiques uniquement
// Les clés secrètes sont côté serveur (Supabase Edge Functions)

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const APP_CONFIG = {
  name: 'Teaven',
  version: '1.0.0',
  restaurant: {
    name: 'Teaven',
    city: 'Franconville',
    region: 'Île-de-France',
  },
} as const;
