# ⚠️ NOUVEAU PROJET · TEAVEN BOUTIQUE (dépôt séparé à créer)

> **Ce fichier ne concerne PAS Teaven-app.** C'est le brief de référence du futur projet e-commerce **Teaven Boutique** (Next.js / Square / Vercel), stocké ici temporairement car ce dépôt est le seul accessible à la session.
>
> **À faire à la création du dépôt `teaven-boutique` :** déplacer ce fichier à sa racine (il a vocation à devenir son `CLAUDE.md`), puis le supprimer d'ici.
>
> Aucune instruction de ce document ne s'applique au code de Teaven-app (l'app mobile Expo / Supabase). Le projet Boutique est 100% Square + Brevo, zéro base annexe : il n'utilise ni Supabase ni la structure de ce dépôt.

---

# TEAVEN BOUTIQUE · Brief technique de développement
## E-commerce Next.js / Square / Vercel · Document de référence pour Claude Code

**Version 1.7 · 6 juillet 2026**
**Décisions actées : comptes clients + fidélité dès la v1 (non négociable). Architecture 100% Square, AUCUNE base de données annexe. Connexion par numéro de téléphone (code SMS), même mécanisme que le Click & Collect. Emails et SMS via Brevo (déjà en place, aucun nouvel outil). Fidélité : le programme Square ACTUEL (ancien programme, récompenses salon type brunch et formule midi) reste en place, on l'enrichit sans le remplacer. Domaine et transporteur : à trancher plus tard, prévoir des configurations facilement modifiables.**

**Addendum (6 juillet 2026, décision Johan) : avant TOUT déploiement sur Vercel, un modèle (maquette construite dans Claude) est présenté à Johan et validé par lui. Aucun déploiement sans cette validation explicite. Ce point s'applique au premier déploiement comme aux évolutions majeures d'interface.**

---

# 1. CONTEXTE ET MISSION

Teaven est une marque de bien-être (salon de thé, brunch, boutique) basée à Franconville (95), avec un corner à Rueil-Malmaison. La boutique en ligne actuelle est endormie. Mission : construire un e-commerce premium neuf, indépendant du Click & Collect existant (teaven-commande), pour vendre les produits d'épicerie fine Teaven en France entière.

**Positionnement produit :** petites quantités, produits très purs, triés sur le volet. Sourcing direct auprès de planteurs. L'anti-marketplace. La rareté est assumée (éditions limitées en petits lots).

**Le cœur de l'expérience Teaven est le programme de fidélité gamifié "Les Parenthèses".** Chaque achat fait progresser le client dans les tiers. Le compte client et la fidélité sont donc présents dès la v1, ce n'est pas une option. Le site doit donner envie de se connecter, de gagner des points, de progresser.

**Séparation stricte avec le Click & Collect :** aucun plat, aucune boisson préparée, aucun créneau de retrait du jour. Ici on vend des produits secs expédiés ou retirés en boutique sous 24-72h.

**Philosophie d'outillage : on capitalise sur la base technologique existante.** Square (catalogue, clients, fidélité, paiement), Brevo (emails, SMS), Vercel, Next.js. On ne connecte aucun outil nouveau sans nécessité absolue.

---

# 2. STACK TECHNIQUE IMPOSÉE · 100% SQUARE + BREVO, ZÉRO BASE ANNEXE

| Couche | Choix | Notes |
|---|---|---|
| Framework | Next.js 14+ App Router, TypeScript strict | Même base que teaven-commande |
| Hébergement | Vercel | |
| Catalogue produits | Square Catalog API | Source de vérité unique |
| Stock | Square Inventory API | Décrément en temps réel, critique pour les éditions limitées |
| Commandes | Square Orders API | Fulfillment SHIPMENT et PICKUP |
| Paiement | Square Web Payments SDK | CB uniquement, jamais de chèques |
| Base client | Square Customers API | LA base client. Profils, adresses, téléphone : tout vit dans Square |
| Fidélité | Square Loyalty API | Square = source de vérité des points. Compte fidélité nativement indexé par le numéro de téléphone |
| Connexion | Code à usage unique par SMS (OTP) envoyé via Brevo + session cookie JWT httpOnly signé | Même identifiant que le Click & Collect, la caisse et l'app : le numéro de téléphone. Aucune base de données |
| Emails et SMS | Brevo (déjà en place chez Teaven) | Code de connexion SMS, confirmations email, expédition, bienvenue fidélité |
| Contenu enrichi produits | Square custom attributes, fallback fichiers MDX dans le repo | Pas de base annexe |
| Styles | Tailwind CSS avec tokens Teaven | Voir section 6 |

**Principe directeur : la base client est logée dans Square, identifiée par le numéro de téléphone, point final.** Le site ne stocke aucune donnée client. La session est un simple cookie signé contenant le square_customer_id, vérifié côté serveur. Comme sur le Click & Collect, on retrouve le client par son téléphone, puis on le pousse à compléter son profil Square.

**Architecture Square :** utiliser une location Square dédiée ou un canal identifiable pour distinguer les commandes Boutique des commandes Click & Collect et des ventes en caisse Franconville. Ne jamais mélanger les flux.

---

# 3. CONNEXION ET COMPTE CLIENT (V1, PRIORITAIRE)

Leçon de teaven-commande v1 : pas de fausse auth, pas de placeholder. Cette fois, connexion réelle, sans base de données, avec le même mécanisme que le Click & Collect : le numéro de téléphone.

## Flux de connexion (sans mot de passe, par téléphone)
1. Le client saisit son numéro de téléphone (format FR, normalisé en E.164 : +33...).
2. Le site envoie un code à 6 chiffres par SMS via Brevo, valable 10 minutes. Le code est stocké de façon éphémère et signée (JWT court ou cache serveur), jamais en base.
3. Code validé : recherche du Customer Square par numéro de téléphone. S'il existe (client du salon, du Click & Collect ou de l'app), on le retrouve : c'est le MÊME client et le MÊME compte fidélité partout. Sinon, création du Customer.
4. Connexion = inscription fidélité : si le client n'est pas encore dans le programme Les Parenthèses, inscription automatique via Loyalty API au moment de la connexion (Square Loyalty est nativement construit autour du numéro de téléphone, c'est un mariage naturel). Un seul geste : je me connecte, je suis fidélisé.
5. Session : cookie httpOnly signé (SESSION_SECRET) contenant le square_customer_id, durée 30 jours, renouvelée à chaque visite.
6. Protection : rate limiting sur l'envoi de codes (max 3 par numéro par 15 min), codes à usage unique, protection contre l'énumération de numéros.

## Complétion progressive du profil (logique Teaven habituelle)
Le compte se remplit au fil de l'eau, on pousse à compléter :
- À la première connexion : prénom, nom, email (l'email est nécessaire pour les confirmations de commande et le suivi d'expédition, on le demande tôt mais sans bloquer).
- Au premier checkout livraison : adresse complète, enregistrée dans le Customer Square pour les prochaines fois.
- Indicateur de complétion du profil dans l'espace compte ("Profil complété à 60%"), avec micro-incitation dans le ton Teaven.
- Toutes les données vont dans les champs natifs du Customer Square (given_name, family_name, email_address, phone_number, address). Rien ailleurs.

## Espace compte (/compte)
- **Ma fidélité** : page vedette. Solde de points, tier actuel, progression visuelle vers le tier suivant, historique des gains. C'est la page la plus soignée de l'espace compte.
- **Mes commandes** : historique lu via Orders API filtré sur le customer_id, statut (en préparation, expédiée, retirée), détail.
- **Mon profil** : coordonnées et adresse, lues et écrites directement dans le Customer Square.

## Checkout invité
Possible techniquement, mais le numéro de téléphone est demandé au checkout de toute façon (nécessaire pour la livraison). Il crée ou retrouve donc un Customer Square, et les points sont crédités sur ce compte. Bandeau incitatif : "Connectez-vous en 10 secondes avec ce numéro et retrouvez vos Parenthèses". L'invité d'aujourd'hui retrouve ses points dès qu'il se connecte avec le même numéro.

---

# 4. FIDÉLITÉ · LOGIQUE À TROIS ÉTAGES (V1)

**État des lieux :** le programme Square actuellement en production est l'ANCIEN programme, avec des récompenses salon (brunch offert, formule midi, etc.). Le nouveau programme Les Parenthèses (5 tiers : Première Parenthèse, Habitude, Rituel, Sérénité, Essentia) est architecturé mais pas encore déployé dans Square. La boutique doit donc être intéressante pour un client de Toulouse qui ne mettra jamais les pieds au salon, SANS casser le programme existant, et en préparant la migration vers Les Parenthèses.

## Étage 1 · Les points : programme actuel, intouché
- La boutique crédite les points sur le programme Square existant via Loyalty API (événement d'accumulation).
- Un seul compteur pour tous les canaux : caisse, Click & Collect, app, boutique. Indexé par le numéro de téléphone.
- Le site ne stocke aucun solde. Square = source de vérité, toujours.

## Étage 2 · Les récompenses : table d'équivalence côté site, ZÉRO modification dans Square
**Principe validé par Johan : on ne touche à RIEN dans le dashboard Square. Pas de nouveau palier, pas de renommage. Le programme reste strictement tel qu'il est, le Click & Collect et la caisse ne voient aucun changement.**

- Les paliers Square existants gardent leurs seuils de points (ex : 300 points = brunch). Le site e-commerce définit sa PROPRE table d'équivalence sur les mêmes seuils, dans /config/loyalty.ts :

| Seuil de points (identique aux paliers salon) | Récompense affichée au salon / Click & Collect | Récompense affichée sur la boutique |
|---|---|---|
| 300 (exemple) | Brunch offert | 5€ de remise sur la commande |
| Palier suivant (exemple) | Formule midi | 12€ de remise ou livraison offerte |

  (Seuils et montants provisoires : à calibrer sur les vrais paliers remontés par l'audit Sprint 0, avec un rapport valeur/points équilibré entre les deux mondes pour éviter tout arbitrage.)

- **Mécanique d'activation au checkout (opération serveur atomique) :**
  1. Le client connecté ayant assez de points voit la récompense boutique activable ("Vous avez 300 points : profitez de 5€ offerts").
  2. À l'activation, le serveur déduit les points via l'ajustement de points de la Loyalty API, avec un libellé traçable systématique : "Boutique en ligne · 5€ offerts · commande #XXXX".
  3. Dans la même opération, la remise correspondante est appliquée directement sur l'Order Square (remise au niveau de la commande).
  4. Si le paiement échoue ou si la commande est annulée : recrédit automatique des points, avec libellé miroir.
- **Traçabilité : libellés STRUCTURÉS obligatoires, jamais de texte libre.** Ces dépenses apparaissent dans Square comme des ajustements de points, pas comme des récompenses nommées. Pour rester exploitable, chaque ajustement suit un format machine-lisible strict, par exemple : `BOUTIQUE|REMISE_5EUR|commande#1234|2026-07-06` (et format miroir `BOUTIQUE|RECREDIT|...` en cas d'annulation). En complément, la remise appliquée sur l'Order porte toujours un nom lisible ("Récompense fidélité · 5€ offerts") : l'information existe ainsi à deux endroits chez Square, côté fidélité et côté commande.
- **Pilotage : page /admin/fidelite (protégée) dans le site.** Mini tableau de bord qui interroge à la demande les événements Loyalty et les Orders chez Square, parse les libellés structurés, et affiche : activations par récompense, points dépensés vs points gagnés par période, récompense la plus populaire, panier moyen avec vs sans récompense, répartition des clients par niveau. Aucune donnée stockée côté site : Square reste l'unique source, le site agrège en lecture. Évolution possible : intégration de ces indicateurs au dashboard Echo existant.
- Résultat : le client de Franconville et celui de Toulouse cumulent les MÊMES points sur les MÊMES seuils, chaque canal affiche sa propre lecture des récompenses, et Square n'est jamais modifié. Un seul compteur, deux vitrines, zéro risque de pollution entre canaux.
- Le code ne code jamais en dur les montants : tout vit dans /config/loyalty.ts.

## Étage 3 · Les niveaux et privilèges : calculés par le site, sans toucher à Square
- L'ancien programme n'a pas de tiers. Mais Square expose le CUMUL DE POINTS À VIE (lifetime points) de chaque compte fidélité.
- Le site en déduit un niveau client à partir de seuils définis dans /config/loyalty.ts (aucune base, aucune modification du programme Square) :

| Niveau (nom Parenthèses, affiché sur le site) | Seuil (points cumulés, provisoire, configurable) | Privilège boutique |
|---|---|---|
| Première Parenthèse | 0 | Bienvenue, découverte du programme |
| Habitude | 100 | Franco de port abaissé (ex : 35€ au lieu de 49€) |
| Rituel | 300 | Accès 48h en avance aux éditions limitées |
| Sérénité | 600 | Accès 72h en avance + échantillon surprise dans chaque colis |
| Essentia | 1200 | Lots réservés sur les éditions limitées + attention d'anniversaire |

- **Le privilège phare est l'ACCÈS ANTICIPÉ aux éditions limitées.** Teaven vend de la rareté : donner aux fidèles le droit d'acheter avant les autres est la récompense la plus désirable du positionnement, elle ne coûte presque rien, et elle fonctionne aussi bien à Toulouse qu'à Franconville. Implémentation : chaque édition limitée a une date d'ouverture générale et des fenêtres anticipées par niveau, contrôlées côté serveur.
- Les seuils et privilèges vivent dans la config : ajustables en une ligne après validation avec Alexandra.

## Migration future vers Les Parenthèses
- Les noms de niveaux affichés sur le site sont déjà ceux des Parenthèses : la marque s'installe dès maintenant.
- Le jour où le programme Les Parenthèses est déployé dans Square, les points cumulés suivent (même comptes, même téléphones), les seuils sont déjà définis, et le site bascule sa lecture des niveaux du fichier de config vers le programme Square. Migration indolore, prévue dans l'architecture dès la v1.

## Gamification (l'esprit Teaven)
- Barre de progression vers le niveau suivant visible dans l'espace compte et dans la confirmation de commande ("Plus que 40 points avant Rituel et l'accès anticipé aux éditions limitées").
- Confirmation de commande : points gagnés affichés de façon célébratoire mais élégante, dans le ton Teaven (sobre, chaleureux, jamais criard, pas de confettis agressifs).
- Message de bienvenue fidélité à la première connexion (email via Brevo, ou SMS court si pas encore d'email).

---

# 5. CATALOGUE ET PAGES

## Catégories de lancement
1. Miels
2. Matcha
3. Thés
4. Infusions
5. Super-aliments
6. Éditions limitées (transverse, mise en avant home)

## Source de vérité
- Produits, prix, variantes (grammages), photos, stock : Square Catalog + Inventory.
- Filtrage : seuls les items marqués vendables en ligne apparaissent (catégorie Square ou custom attribute "boutique_en_ligne"). Jamais de plats ni de boissons du salon.
- Contenu enrichi (origine, planteur, notes de dégustation, rituel de préparation : température, temps d'infusion, grammage conseillé) : en priorité dans les custom attributes Square du Catalog. Si trop limitant, fichiers MDX versionnés dans le repo (/content/produits/[catalog_id].mdx). Fallback gracieux si absent. Pas de base de données.

## Pages du site
1. **Home** : hero immersif univers Teaven, section Éditions limitées en vedette, entrées par catégorie, bloc storytelling sourcing, bloc fidélité ("Chaque commande vous rapproche de votre prochaine Parenthèse").
2. **Catégorie** (/thes, /miels...) : grille épurée, grandes photos, tri simple. Pas de filtres complexes en v1.
3. **Fiche produit** : galerie photos, description sensorielle, bloc origine, bloc rituel de préparation, sélecteur de variante, stock visible si édition limitée ("Il reste 12 exemplaires"), CTA ajout panier.
4. **Panier** : drawer latéral + page dédiée, mention du seuil franco de port si défini.
5. **Checkout** : une page, étapes claires : coordonnées (préremplies depuis le Customer Square si connecté), mode (livraison ou retrait Franconville), paiement Square. Rappel des points fidélité à gagner.
6. **Confirmation** : récap, points gagnés, progression tier, invitation à suivre l'expédition.
7. **Compte** : voir section 3.
8. **Pages légales complètes dès la v1** (voir section 8).
9. **Page "Notre histoire / Sourcing"** : contenu de marque.

## Module Éditions limitées
- Badge visuel dédié, compteur de stock restant lu en temps réel via Inventory API.
- Verrouillage anti-survente : vérification de stock au moment du paiement, jamais seulement à l'ajout panier.
- Archive des éditions passées ("épuisée") pour construire la désirabilité.

---

# 6. DESIGN SYSTEM TEAVEN (STRICT, VALIDÉ AVRIL 2026)

## Typographie
- Titres : Bw Modelica
- Corps : DM Sans
- Serif : INTERDIT partout sauf le logotype Teaven (exception sacrée)

## Palette de base (seules couleurs autorisées hors pilier)
- #75967F : vert, CTA primaires
- #F0F0E5 : fond général
- #EBE8DF : fonds de sections
- #FFFFFF : cartes
- #1C1C1A : texte uniquement
- Fidélité (pilier) : #2D5A3D forest green pour les éléments du programme Les Parenthèses

## Boutons (radius 8px strict, partout, géométrie sacrée)
- Primaire : fond #75967F, texte crème #F0F0E5
- Secondaire : outline #738478, sans remplissage
- Tertiaire : fond crème, bordure #D4CFC2, texte #1C1C1A

## Interdits absolus
- Jamais de fond noir
- Jamais de pilules 50px
- Jamais de serif hors logotype
- Jamais d'em dash (—) dans les textes : utiliser virgules, deux-points, points ou interpoints (·)
- Avant toute modification de couleur dans du code existant : auditer les couleurs présentes dans la source, ne jamais supposer

## Direction artistique
Warm Organic Minimalism : beaucoup d'air, grandes photos produits sur fonds crème, textures naturelles, rythme lent. Référence : épicerie fine premium, pas marketplace. Navigation flate, sobre.

---

# 7. LIVRAISON ET RETRAIT

## Modes (v1)
1. **Livraison à domicile** France métropolitaine. Transporteur non encore choisi : implémenter un calcul de frais de port par CONFIGURATION (fichier /config/shipping.ts), jamais en dur dans les composants. Valeurs par défaut provisoires : forfait 5,90€, franco à partir de 49€, modifiables en une ligne.
2. **Retrait gratuit à Franconville** (19 place de la République, 95130) : fulfillment PICKUP, préparé sous 24-48h ouvrées, notification quand prêt (email, ou SMS Brevo si pas d'email).

## Commande côté Square
- Fulfillment SHIPMENT avec adresse complète pour la livraison, PICKUP pour le retrait.
- Statuts synchronisés : payée, en préparation, expédiée (avec numéro de suivi saisi côté back), retirée.
- Le suivi d'expédition v1 : numéro de suivi ajouté dans le fulfillment Square + lien transporteur dans l'email et l'espace compte. Pas d'intégration API transporteur en v1.

## TVA
- Produits alimentaires secs : 5,5%, configurée dans Square au niveau des items. Le site affiche TTC. Vérifier item par item lors de l'audit catalogue.

---

# 8. PAGES LÉGALES (OBLIGATOIRES V1, PAS DE PLACEHOLDERS)

Vente à distance = obligations renforcées. Générer de vraies pages complètes :
1. **CGV e-commerce** : identité vendeur (Teaven SARL, RCS Pontoise), prix TTC, modalités de paiement (CB uniquement), livraison et délais, droit de rétractation 14 jours (produits alimentaires scellés : exception si descellés, à mentionner), retours et remboursements, garanties légales, médiation de la consommation.
2. **Mentions légales** : éditeur, hébergeur (Vercel), directeur de publication.
3. **Politique de confidentialité RGPD** : données collectées (téléphone, compte, commandes, fidélité, logées chez Square, communications via Brevo), finalités, durées, droits, cookies. Mentionner le consentement SMS.
4. **Politique de livraison et retours** : page dédiée lisible, pas seulement dans les CGV.
5. Bandeau cookies conforme si analytics.

Marquer clairement dans le code les champs à faire valider par Johan (numéro SIRET exact, adresse de médiateur choisi).

---

# 9. STRUCTURE PROJET SUGGÉRÉE

```
/app
  /(boutique)
    page.tsx                 // Home
    /[categorie]/page.tsx    // Catégories
    /produit/[slug]/page.tsx
    /panier/page.tsx
    /commander/page.tsx      // Checkout
    /confirmation/[id]/page.tsx
  /connexion/page.tsx        // Saisie téléphone + code SMS
  /compte
    /fidelite/page.tsx
    /commandes/page.tsx
    /profil/page.tsx
  /admin
    /fidelite/page.tsx       // pilotage fidélité (protégé) : stats lues en direct chez Square
  /(legal)
    /cgv, /mentions-legales, /confidentialite, /livraison-retours
/lib
  /square                    // clients Catalog, Inventory, Orders, Payments, Customers, Loyalty
  /brevo                     // envoi SMS (OTP) et emails transactionnels
  /auth                      // génération et vérification OTP, session JWT cookie
/config
  shipping.ts                // frais de port CONFIGURABLES
  loyalty.ts                 // seuils de niveaux, privilèges, et table d'équivalence points → récompenses boutique (Square jamais modifié)
/content
  /produits                  // MDX enrichis optionnels par catalog_id
/components
  /ui                        // boutons, cartes, inputs aux tokens Teaven
  /fidelite                  // barre de progression, badge tier
  /produit
/notifications               // templates Brevo (SMS OTP, emails confirmation, expédition, bienvenue)
```

## Variables d'environnement attendues
```
SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID_BOUTIQUE, SQUARE_ENVIRONMENT,
SQUARE_LOYALTY_PROGRAM_ID,
NEXT_PUBLIC_SQUARE_APP_ID,
SESSION_SECRET,
BREVO_API_KEY, BREVO_SMS_SENDER,
NEXT_PUBLIC_SITE_URL
```

---

# 10. PLAN DE SPRINTS POUR CLAUDE CODE

## Sprint 0 · Audit et fondations
- Audit du catalogue Square existant : lister items, catégories, photos, variantes, taxes, custom attributes disponibles. Produire un rapport de ce qui manque.
- Vérifier la structure Customers et Loyalty existante (ancien programme : règles d'accumulation, paliers et seuils de points des récompenses salon actuelles, disponibilité des lifetime points et de l'ajustement de points via API, format des numéros de téléphone) pour s'y brancher sans rien casser. Réutiliser le mécanisme d'identification par téléphone du Click & Collect comme référence.
- Setup projet Next.js + Tailwind avec les tokens Teaven, config Vercel.
- Clients Square et Brevo typés dans /lib.

## Sprint 1 · Catalogue et vitrine
- Home, pages catégories, fiches produits alimentées par Square.
- Module éditions limitées avec stock temps réel et mécanisme de fenêtres d'accès anticipé par niveau (contrôle côté serveur).
- SEO de base : metadata, sitemap, OpenGraph.

## Sprint 2 · Connexion et fidélité
- Connexion OTP par SMS complète (envoi Brevo, vérification, rate limiting, session cookie).
- Retrouvaille ou création du Customer Square par téléphone, inscription Loyalty automatique à la connexion.
- Espace compte avec page fidélité gamifiée : niveau calculé depuis les lifetime points Square + seuils de /config/loyalty.ts, barre de progression, privilèges affichés. Complétion progressive du profil (email demandé tôt).

## Sprint 3 · Panier, checkout, paiement
- Panier persistant (cookie ou localStorage côté client), checkout une page, Square Web Payments.
- Fulfillments SHIPMENT et PICKUP, frais de port configurables, préremplissage depuis le Customer Square.
- Vérification stock au paiement, accumulation points fidélité post-paiement.
- Notifications transactionnelles Brevo (email, SMS en appoint).

## Sprint 4 · Légal, pilotage, finitions, QA
- Quatre pages légales complètes.
- Page /admin/fidelite : agrégation des événements Loyalty et Orders Square (activations par récompense, points gagnés/dépensés, niveaux).
- Espace commandes, statuts, numéro de suivi.
- Tests parcours complet, responsive mobile prioritaire (la clientèle Teaven est mobile), accessibilité de base, Lighthouse.

## Definition of Done v1
- Un client peut : se connecter par code SMS avec son numéro de téléphone, être inscrit au programme fidélité dans le même geste, commander un thé, payer par CB, choisir livraison ou retrait, recevoir ses notifications, voir ses points crédités et son niveau avec ses privilèges dans son espace compte, et retrouver exactement le même compte fidélité qu'au salon, sur l'app et sur le Click & Collect.
- Le programme Square existant (paliers et récompenses salon) n'est ni modifié ni touché, ni par le code ni dans le dashboard. Les récompenses boutique existent uniquement dans la table d'équivalence du site, et chaque dépense de points passe par un ajustement Loyalty API avec libellé traçable.
- Zéro base de données annexe, zéro outil hors stack existante (Square, Brevo, Vercel), zéro placeholder légal, zéro couleur hors design system, zéro em dash.

---

# 11. RÈGLES DE TRAVAIL POUR L'AGENT

1. Square est LA base : catalogue, stock, commandes, clients, adresses, points. Le numéro de téléphone est l'identifiant client universel. Ne créer aucune base de données annexe. Si une donnée semble ne pas avoir sa place dans Square, la stocker dans un custom attribute Square ou un fichier versionné dans le repo, et signaler le cas à Johan.
2. Brevo est LE canal de communication : SMS et emails. Ne pas introduire d'autre service d'envoi.
3. Auditer avant de modifier : lire le code et les données existantes avant toute supposition. Ne pas casser les structures Customers et Loyalty utilisées par l'app mobile, la caisse et le Click & Collect. Le programme fidélité Square actuel (récompenses salon) reste intouché par le code. S'inspirer du mécanisme d'identification par téléphone déjà en production sur le Click & Collect.
4. Design system strict : en cas de doute sur une couleur ou un composant, se référer à la section 6, jamais improviser.
5. Tout ce qui n'est pas encore décidé (transporteur, montants de frais de port, domaine) doit être configurable en un seul endroit.
6. Ton rédactionnel des textes du site : chaleureux, sensoriel, sobre. Vouvoiement. Jamais de marketing agressif, pas de compte à rebours anxiogène, la rareté se dit simplement.
7. Mobile first : la majorité du trafic sera mobile.
8. Signaler explicitement à Johan tout point nécessitant une décision ou une donnée réelle (SIRET, textes légaux, choix transporteur, expéditeur SMS Brevo) plutôt que d'inventer.
9. Validation avant déploiement : avant tout déploiement sur Vercel, construire un modèle dans Claude (maquette navigable des écrans concernés) et le faire valider par Johan. Ne jamais déployer sans cette validation.
