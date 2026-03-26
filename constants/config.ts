// Configuration Teaven — clés publiques uniquement
// Les clés secrètes sont côté serveur (Supabase Edge Functions)

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://uftexzjaosctjyjqkcyy.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGV4emphb3NjdGp5anFrY3l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTEyODUsImV4cCI6MjA4OTUyNzI4NX0.fu6S5DqFXD3Z7WQW6vfBKOOd5ILFMtDU_y18QWgi99I';

export const APP_CONFIG = {
  name: 'Teaven',
  version: '1.0.0',
  restaurant: {
    name: 'Teaven',
    city: 'Franconville',
    region: 'Île-de-France',
  },
} as const;
