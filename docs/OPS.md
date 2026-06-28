# OPS — Comment fonctionne l'environnement Teaven (à lire en début de session)

> Ce document existe pour qu'aucune session Claude Code ne reparte de zéro ni ne
> perde de travail. **Le développeur (Claude) est responsable de sécuriser et
> documenter le travail par défaut, sans qu'on le demande.**

## 1. Architecture — où vit quoi

```
  CODE (GitHub: Teaven-FR/Teaven-app)
    main ............... ligne stable
    claude/<session> ... 1 branche par session Claude Code  ──┐
                                                              │  git push (OBLIGATOIRE)
                                                              ▼
  BUILD (EAS / Expo cloud)  ──>  TESTFLIGHT  ──>  iPhone
    eas build --platform ios --profile production --auto-submit
    (compte Expo: johanbtea — identifiants Apple stockés sur EAS)

  BACKEND (Supabase, projet uftexzjaosctjyjqkcyy) — INDÉPENDANT de l'app
    Edge Functions déployées via MCP Supabase ou dashboard
    Secrets (Square, Uber Direct, Google Places) dans Edge Function Secrets
```

- **L'app (UI + logique client)** vit dans ce dépôt GitHub. C'est la seule source de vérité.
- **Le backend (Supabase)** se déploie séparément et ne bouge pas quand on rebuild l'app.
- **TestFlight** affiche le dernier build EAS réussi. Les artefacts EAS **expirent après 30 jours**.

## 2. Règles d'or (non négociables)

1. **Toujours `git push` à la fin de chaque session**, sur la branche `claude/<session>`.
   Le conteneur Claude Code web est **éphémère** : tout code non poussé est **perdu**
   quand la session se ferme (même si un build TestFlight a été produit entre-temps).
2. **Une seule source de vérité = `main` GitHub.** Toute fonctionnalité finit mergée dans `main`.
3. **Documenter chaque session dans `CHANGELOG.md`** (date, quoi, pourquoi, déploiements).
4. Ne jamais builder/merger une version sans vérifier qu'elle contient bien le dernier
   travail (comparer les dates de commits : `git log -1 origin/main`).

## 3. Incident connu — refonte perdue (carte / profil / stories)

- Une session **`claude/elated-nash-f7c7d0`** a réalisé une refonte (carte, profil,
  stories) + fonctionnalités, **publiée sur TestFlight (v43/v44)** mais **jamais
  poussée sur GitHub**. La branche n'existe pas sur le remote → code source absent.
- **Récupération** : rouvrir cette session sur claude.ai/code et exécuter
  `git push origin claude/elated-nash-f7c7d0`. Si le conteneur est expiré, le code
  source est perdu (seul le build TestFlight compilé subsiste).

## 4. Déploiements

### Edge Functions Supabase
- Via MCP Supabase (`deploy_edge_function`) quand le connecteur "Supabase" est stable,
  sinon via le dashboard (Functions → Edit → coller → Deploy).
- `verify_jwt` : **true** pour les fonctions appelées par l'app (auth), **false** pour
  les webhooks signés (square-webhook, uber-direct-webhook).

### App (TestFlight)
```bash
git checkout <branche-à-jour>
npx eas-cli login                 # compte Expo Teaven
npx eas-cli build --platform ios --profile production --auto-submit
```
- Pré-requis Apple : accepter les contrats sur developer.apple.com + trader status DSA
  sur App Store Connect, sinon l'auto-submit échoue.
