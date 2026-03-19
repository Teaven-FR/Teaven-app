# /sync-catalog — Synchroniser le catalogue Square

Synchronise les produits, variations, modificateurs et images depuis Square vers Supabase.

## Utilisation

```
/sync-catalog
```

## Ce que fait ce skill

1. Appelle la Edge Function `sync-catalog` via Supabase
2. Récupère tous les items, catégories, images et modifier lists depuis Square
3. Upsert les données dans les tables : `products`, `product_variations`, `modifier_groups`, `modifier_options`, `categories`
4. Affiche le résumé des produits synchronisés

## Commande manuelle (si besoin)

```bash
# Via Supabase CLI
supabase functions invoke sync-catalog

# Ou via curl
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/sync-catalog \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Déploiement

```bash
supabase functions deploy sync-catalog
```

## Variables requises (secrets Supabase)

- `SQUARE_ACCESS_TOKEN`
- `SQUARE_ENVIRONMENT` (sandbox | production)
- `SQUARE_LOCATION_ID`
