// ✅ CHANTIER 3 — Créneaux horaires dynamiques — Complété 2026-03-25
// Créneaux horaires basés sur l'heure réelle + horaires Square
// - Les créneaux passés sont masqués (pas juste désactivés)
// - Buffer de 30 minutes minimum avant le prochain créneau disponible
// - Si tous les créneaux du jour sont passés → basculer sur demain

export interface TimeSlot {
  id: string;
  label: string;
  available: boolean;
  ordersInQueue: number;
}

const SLOT_DURATION = 15; // minutes
const MIN_BUFFER = 30; // minutes — délai minimum avant un créneau disponible

/**
 * Génère les créneaux pour un jour donné.
 * @param openHour Heure d'ouverture (par défaut 9)
 * @param closeHour Heure de fermeture (par défaut 20)
 * @param isTomorrow Si true, tous les créneaux sont disponibles (pas de filtre passé)
 */
function generateTimeSlots(openHour = 9, closeHour = 20, isTomorrow = false): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoff = nowMinutes + MIN_BUFFER;

  const isOpen = !isTomorrow && now.getHours() >= openHour && now.getHours() < closeHour;

  // "Dès que possible" — uniquement aujourd'hui et si le restaurant est ouvert
  if (!isTomorrow && isOpen) {
    const asapQueue = (now.getHours() + now.getMinutes()) % 5;
    slots.push({
      id: 'asap',
      label: `Dès que possible (~${asapQueue >= 3 ? 20 : 15} min)`,
      available: true,
      ordersInQueue: asapQueue,
    });
  }

  let slotIndex = 1;

  for (let hour = openHour; hour < closeHour; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_DURATION) {
      const slotStart = hour * 60 + minute;
      const endMinute = minute + SLOT_DURATION;
      const endH = endMinute >= 60 ? hour + 1 : hour;
      const endM = endMinute >= 60 ? 0 : endMinute;

      // Masquer complètement les créneaux passés (avec buffer)
      if (!isTomorrow && slotStart < cutoff) {
        slotIndex++;
        continue;
      }

      const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // File d'attente stable (basée sur l'heure, pas random)
      const queue = ((hour * 4 + Math.floor(minute / 15)) % 6);

      slots.push({
        id: `slot-${slotIndex}`,
        label,
        available: true,
        ordersInQueue: queue,
      });

      slotIndex++;
    }
  }

  return slots;
}

/** Génère des créneaux frais — horaires par défaut */
export function getFreshTimeSlots(): TimeSlot[] {
  return generateTimeSlots();
}

/** Génère des créneaux avec les horaires Square */
export function getTimeSlotsWithHours(openHour: number, closeHour: number): TimeSlot[] {
  return generateTimeSlots(openHour, closeHour);
}

/** Génère les créneaux de demain (tous disponibles) */
export function getTomorrowTimeSlots(openHour = 9, closeHour = 20): TimeSlot[] {
  return generateTimeSlots(openHour, closeHour, true);
}

/**
 * Vérifie s'il reste des créneaux aujourd'hui.
 * Utile pour afficher "Teaven est fermé" et basculer sur demain.
 */
export function hasAvailableSlotsToday(openHour = 9, closeHour = 20): boolean {
  const slots = generateTimeSlots(openHour, closeHour);
  return slots.some((s) => s.available);
}

// Export de compatibilité
export const mockTimeSlots: TimeSlot[] = generateTimeSlots();
