# CLAUDE.md — Guide projet Teaven

## Architecture
- **Framework** : React Native (Expo SDK 52) + Expo Router (tabs)
- **Backend** : Supabase (Auth, Database, Edge Functions, Realtime)
- **Paiement/Catalogue** : Square API (catalogue, commandes, paiements)
- **State** : Zustand (cartStore, authStore) avec AsyncStorage
- **Style** : StyleSheet natif, thème dans `constants/theme.ts`

## Structure
```
app/           → Pages Expo Router (tabs + modale produit)
components/    → UI réutilisables (features/ + ui/)
hooks/         → useCatalog, useOrders, useLoyalty
stores/        → Zustand stores (cart, auth)
lib/           → supabase.ts, square.ts, types.ts
supabase/
  functions/   → Edge Functions (sync-catalog, create-order, process-payment, square-webhook)
  migrations/  → Schema SQL
constants/     → theme.ts, mockData.ts
```

## Commandes
```bash
npx expo start          # Dev
npx tsc --noEmit        # Type check
supabase functions serve # Edge Functions en local
supabase functions deploy sync-catalog  # Déployer une fonction
```

## Conventions
- Prix en **centimes** (integer) partout
- Types dans `lib/types.ts`
- Catalogue Square synché → tables `products`, `product_variations`, `modifier_groups`, `modifier_options`
- Les clés Square sont dans les **Supabase secrets**, jamais côté client
- Catégories : nourrir | savourer | emporter | patisseries
- Fidélité : Bronze (0) → Argent (200) → Or (500) → Platine (1000)

## Flow commande
1. Client choisit produit + variation + modificateurs
2. `useOrders.placeOrder()` → Edge Function `create-order` → Square Orders API
3. Square retourne l'order ID + total calculé
4. `useOrders.payOrder()` → Edge Function `process-payment` → Square Payments API
5. Webhook Square → `square-webhook` → met à jour le statut en temps réel
