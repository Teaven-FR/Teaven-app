/**
 * Script one-shot — régularisation compte wallet Johan (21 avril 2026).
 *
 * Objectif : unifier les 2 gift cards Square du compte en une seule,
 * restaurer le solde correct (53,20 €), désactiver la carte obsolète.
 *
 * Ordre des opérations (séquence Square-safe) :
 *   1. LOAD 2000 cts sur gftc:1d9aa8... (...104545)  → régul 25€ → 45€
 *   2. CLEAR_BALANCE sur gftc:4dab11... (...995248)  → vide les 8,20€ (préalable DEACTIVATE)
 *   3. LOAD 820 cts sur gftc:1d9aa8... (...104545)   → transfert compensatoire 45€ → 53,20€
 *   4. DEACTIVATE gftc:4dab11... (...995248)         → désactivation définitive
 *
 * Contexte business : Consortium Produit, 21 avril 2026. Doctrine réaffirmée :
 * 1 gift card active max par client, Square source de vérité unique.
 *
 * Lancement :
 *   SQUARE_ACCESS_TOKEN=xxxxx npx tsx scripts/reconcile-johan-wallet.ts
 *   (ajouter SQUARE_ENVIRONMENT=sandbox pour tester d'abord)
 */

const CUSTOMER_ID = '8K346DR7V5BD4DMWEX6CJKYDWC';
const LOCATION_ID = 'LTHCVPE9G0T0K';
const CARD_MAIN = 'gftc:1d9aa8c2682b4820b4626cdf5f51abf4'; // ...104545 (conservée)
const CARD_OBSOLETE = 'gftc:4dab11ea852d459c92b0ca85e3c6c3bf'; // ...995248 (désactivée)
const AMOUNT_REGUL = 2000; // centimes
const AMOUNT_TRANSFER = 820; // centimes

const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const ENV = process.env.SQUARE_ENVIRONMENT ?? 'production';
const BASE_URL = ENV === 'production'
  ? 'https://connect.squareup.com'
  : 'https://connect.squareupsandbox.com';
const API_VERSION = '2025-01-23';

if (!TOKEN) {
  console.error('❌ SQUARE_ACCESS_TOKEN manquant.');
  console.error('   Usage : SQUARE_ACCESS_TOKEN=xxxxx npx tsx scripts/reconcile-johan-wallet.ts');
  process.exit(1);
}

console.log(`🌍 Environnement : ${ENV.toUpperCase()}`);
console.log(`🎯 Customer     : ${CUSTOMER_ID}`);
console.log(`📍 Location     : ${LOCATION_ID}\n`);

// ─── Helpers ───────────────────────────────────────────────────────────
async function squareFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Square-Version': API_VERSION,
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `Square ${res.status} ${res.statusText} sur ${path}\n${JSON.stringify(body, null, 2)}`,
    );
  }
  return body;
}

async function getCardState(giftCardId: string): Promise<{ balance: number; state: string }> {
  const { gift_card } = await squareFetch(`/v2/gift-cards/${giftCardId}`);
  return {
    balance: gift_card?.balance_money?.amount ?? 0,
    state: gift_card?.state ?? 'UNKNOWN',
  };
}

function fmt(cts: number): string {
  return `${(cts / 100).toFixed(2)} €`;
}

function uuid(): string {
  // Node 18+ : crypto.randomUUID global
  return globalThis.crypto.randomUUID();
}

// ─── Activités Square Gift Cards ──────────────────────────────────────
//
// Pour une régularisation administrative (pas une vraie recharge client payée),
// on utilise ADJUST_INCREMENT. LOAD est réservé aux recharges liées à un order
// Square ou à un moyen de paiement client (buyer_payment_instrument_id).
async function adjustIncrement(
  giftCardId: string,
  amount: number,
  reason: 'SUPPORT_ISSUE' | 'COMPLIMENTARY',
  label: string,
) {
  console.log(`→ ADJUST_INCREMENT ${fmt(amount)} sur ${giftCardId} (${label})`);
  const { gift_card_activity } = await squareFetch('/v2/gift-cards/activities', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: uuid(),
      gift_card_activity: {
        type: 'ADJUST_INCREMENT',
        location_id: LOCATION_ID,
        gift_card_id: giftCardId,
        adjust_increment_activity_details: {
          amount_money: { amount, currency: 'EUR' },
          reason,
        },
      },
    }),
  });
  console.log(`  ✅ activity ${gift_card_activity.id}\n`);
}

async function clearBalanceActivity(giftCardId: string, label: string) {
  console.log(`→ CLEAR_BALANCE sur ${giftCardId} (${label})`);
  const { gift_card_activity } = await squareFetch('/v2/gift-cards/activities', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: uuid(),
      gift_card_activity: {
        type: 'CLEAR_BALANCE',
        location_id: LOCATION_ID,
        gift_card_id: giftCardId,
        clear_balance_activity_details: {
          // Enum Square : SUSPICIOUS_ACTIVITY | REUSE_GIFTCARD | UNKNOWN_REASON.
          // UNKNOWN_REASON est rejeté en pratique pour CLEAR_BALANCE. REUSE_GIFTCARD
          // correspond exactement au cas : solde réémis sur la carte principale.
          reason: 'REUSE_GIFTCARD',
        },
      },
    }),
  });
  console.log(`  ✅ activity ${gift_card_activity.id}\n`);
}

async function deactivateActivity(giftCardId: string, label: string) {
  console.log(`→ DEACTIVATE ${giftCardId} (${label})`);
  const { gift_card_activity } = await squareFetch('/v2/gift-cards/activities', {
    method: 'POST',
    body: JSON.stringify({
      idempotency_key: uuid(),
      gift_card_activity: {
        type: 'DEACTIVATE',
        location_id: LOCATION_ID,
        gift_card_id: giftCardId,
        deactivate_activity_details: {
          // Enum Square : SUSPICIOUS_ACTIVITY | UNKNOWN_REASON | CHARGEBACK_DEACTIVATE.
          // UNKNOWN_REASON et CHARGEBACK_* rejetés hors contexte propre. Seul
          // SUSPICIOUS_ACTIVITY reste utilisable pour retirer une carte doublon.
          reason: 'SUSPICIOUS_ACTIVITY',
        },
      },
    }),
  });
  console.log(`  ✅ activity ${gift_card_activity.id}\n`);
}

// ─── Séquence idempotente ───────────────────────────────────────────────
// Chaque étape vérifie l'état avant d'agir : on peut relancer le script
// sans risque de double-crédit ou double-débit.
const TARGET_MAIN_BALANCE = 5320; // 53,20 € = 25 + 20 (régul) + 8,20 (transfert)

async function main() {
  console.log('📊 État initial :');
  const main0 = await getCardState(CARD_MAIN);
  const obsolete0 = await getCardState(CARD_OBSOLETE);
  console.log(`   Carte principale  ${CARD_MAIN}  →  ${fmt(main0.balance)} (${main0.state})`);
  console.log(`   Carte obsolète    ${CARD_OBSOLETE}  →  ${fmt(obsolete0.balance)} (${obsolete0.state})\n`);

  // Déjà terminé ? → exit clean
  if (main0.balance === TARGET_MAIN_BALANCE && obsolete0.state === 'DEACTIVATED') {
    console.log('✅ Régularisation déjà effectuée. Rien à faire.');
    return;
  }

  console.log('🚀 Reprise / démarrage de la séquence :\n');

  // ── Étape 1 — régul carte principale (+20€)
  //    Condition : solde principal < 45€ (25 + 20)
  if (main0.balance < 4500) {
    await adjustIncrement(CARD_MAIN, AMOUNT_REGUL, 'SUPPORT_ISSUE', 'régularisation solde historique');
  } else {
    console.log('⏭  Étape 1 déjà faite (carte principale ≥ 45€).\n');
  }

  // ── Étape 2 — vider la carte obsolète
  //    Condition : carte obsolète a un solde > 0
  if (obsolete0.balance > 0) {
    // Safety : vérifier qu'on ne vide pas un montant inattendu
    if (obsolete0.balance !== AMOUNT_TRANSFER) {
      console.warn(
        `⚠️  Solde carte obsolète = ${fmt(obsolete0.balance)}, attendu ${fmt(AMOUNT_TRANSFER)}.`,
      );
      console.warn(`   Abandon pour ne pas perdre d'argent. Vérifie Square avant de relancer.\n`);
      process.exit(2);
    }
    await clearBalanceActivity(CARD_OBSOLETE, 'préalable désactivation');
  } else {
    console.log('⏭  Étape 2 déjà faite (carte obsolète à 0).\n');
  }

  // ── Étape 3 — transfert compensatoire vers carte principale (+8,20€)
  //    Condition : solde principal < 53,20€ ET carte obsolète a été vidée
  const mainNow = (await getCardState(CARD_MAIN)).balance;
  if (mainNow < TARGET_MAIN_BALANCE) {
    await adjustIncrement(CARD_MAIN, AMOUNT_TRANSFER, 'SUPPORT_ISSUE', 'transfert depuis carte ...995248');
  } else {
    console.log('⏭  Étape 3 déjà faite (carte principale à 53,20€+).\n');
  }

  // ── Étape 4 — désactivation définitive de la carte obsolète
  //    Condition : carte obsolète ACTIVE
  const obsoleteNow = await getCardState(CARD_OBSOLETE);
  if (obsoleteNow.state === 'ACTIVE') {
    if (obsoleteNow.balance !== 0) {
      console.error(`❌ Impossible de DEACTIVATE carte ${CARD_OBSOLETE} : solde ${fmt(obsoleteNow.balance)} ≠ 0.`);
      process.exit(4);
    }
    await deactivateActivity(CARD_OBSOLETE, 'carte doublon obsolète');
  } else {
    console.log(`⏭  Étape 4 déjà faite (carte obsolète ${obsoleteNow.state}).\n`);
  }

  // ─── Vérification finale ─────────────────────────────────────────────
  console.log('📊 État final :');
  const mainEnd = await getCardState(CARD_MAIN);
  const obsoleteEnd = await getCardState(CARD_OBSOLETE);
  console.log(`   Carte principale  ${CARD_MAIN}  →  ${fmt(mainEnd.balance)} (${mainEnd.state})`);
  console.log(`   Carte obsolète    ${CARD_OBSOLETE}  →  ${fmt(obsoleteEnd.balance)} (${obsoleteEnd.state})\n`);

  if (mainEnd.balance === TARGET_MAIN_BALANCE && obsoleteEnd.state === 'DEACTIVATED') {
    console.log(`✅ Régularisation OK : solde carte principale = ${fmt(mainEnd.balance)}`);
  } else {
    console.error(
      `❌ État final inattendu. Attendu : main=${fmt(TARGET_MAIN_BALANCE)} + obsolete=DEACTIVATED.`,
    );
    process.exit(3);
  }
}

main().catch((err) => {
  console.error('\n💥 Erreur :', err.message);
  process.exit(1);
});
