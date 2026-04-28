// ✅ CHANTIER 3 — Créneaux horaires dynamiques
// Créneaux horaires basés sur l'heure réelle + horaires Square (source de vérité)
// - Les créneaux passés sont masqués (pas juste désactivés)
// - Buffer de 30 min minimum avant le prochain créneau disponible
// - Dernier créneau proposé termine au plus tard close - PREP_BUFFER (défaut 15 min)
// - Si tous les créneaux du jour sont passés → basculer sur demain

export interface TimeSlot {
  id: string;
  label: string;
  available: boolean;
  ordersInQueue: number;
}

const SLOT_DURATION = 15; // minutes
const MIN_BUFFER = 30; // délai minimum entre maintenant et un créneau sélectionnable
// Buffer de préparation avant fermeture — dernier créneau ne peut pas dépasser close - PREP_BUFFER
// ⚠ Valeur à confirmer avec Johan — défaut 15 min
const PREP_BUFFER = 15;

interface GenerateOpts {
  openMinutes: number;
  closeMinutes: number;
  isTomorrow?: boolean;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function generateTimeSlots({ openMinutes, closeMinutes, isTomorrow = false }: GenerateOpts): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoff = nowMinutes + MIN_BUFFER;

  // Le dernier créneau ne peut pas dépasser l'heure de fermeture moins le buffer de prépa
  const lastSlotEnd = closeMinutes - PREP_BUFFER;

  const isOpen = !isTomorrow && nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  // "Dès que possible" — uniquement aujourd'hui et si le restaurant est ouvert (avec buffer)
  if (!isTomorrow && isOpen && cutoff <= lastSlotEnd) {
    const asapQueue = (now.getHours() + now.getMinutes()) % 5;
    slots.push({
      id: 'asap',
      label: `Dès que possible (~${asapQueue >= 3 ? 20 : 15} min)`,
      available: true,
      ordersInQueue: asapQueue,
    });
  }

  let slotIndex = 1;

  // Premier créneau aligné sur un multiple de SLOT_DURATION >= openMinutes
  const firstSlot = Math.ceil(openMinutes / SLOT_DURATION) * SLOT_DURATION;

  for (let slotStart = firstSlot; slotStart + SLOT_DURATION <= lastSlotEnd; slotStart += SLOT_DURATION) {
    // Masquer les créneaux passés (avec buffer)
    if (!isTomorrow && slotStart < cutoff) {
      slotIndex++;
      continue;
    }

    const slotEnd = slotStart + SLOT_DURATION;
    const startH = Math.floor(slotStart / 60);
    const startM = slotStart % 60;
    const endH = Math.floor(slotEnd / 60);
    const endM = slotEnd % 60;

    const label = `${pad2(startH)}:${pad2(startM)} - ${pad2(endH)}:${pad2(endM)}`;

    // File d'attente stable (basée sur l'heure, pas random)
    const queue = ((startH * 4 + Math.floor(startM / 15)) % 6);

    slots.push({
      id: `slot-${slotIndex}`,
      label,
      available: true,
      ordersInQueue: queue,
    });

    slotIndex++;
  }

  return slots;
}

function hoursToMinutes(h: number, m = 0): number {
  return h * 60 + m;
}

/** Génère des créneaux frais — horaires par défaut (9h-20h) */
export function getFreshTimeSlots(): TimeSlot[] {
  return generateTimeSlots({ openMinutes: hoursToMinutes(9), closeMinutes: hoursToMinutes(20) });
}

/** Génère des créneaux avec les horaires Square (heures + minutes optionnelles) */
export function getTimeSlotsWithHours(
  openHour: number,
  closeHour: number,
  openMinute = 0,
  closeMinute = 0,
): TimeSlot[] {
  return generateTimeSlots({
    openMinutes: hoursToMinutes(openHour, openMinute),
    closeMinutes: hoursToMinutes(closeHour, closeMinute),
  });
}

/** Génère les créneaux de demain (tous disponibles) */
export function getTomorrowTimeSlots(
  openHour = 9,
  closeHour = 20,
  openMinute = 0,
  closeMinute = 0,
): TimeSlot[] {
  return generateTimeSlots({
    openMinutes: hoursToMinutes(openHour, openMinute),
    closeMinutes: hoursToMinutes(closeHour, closeMinute),
    isTomorrow: true,
  });
}

/**
 * Vérifie s'il reste des créneaux aujourd'hui (utile pour basculer sur demain).
 */
export function hasAvailableSlotsToday(
  openHour = 9,
  closeHour = 20,
  openMinute = 0,
  closeMinute = 0,
): boolean {
  const slots = generateTimeSlots({
    openMinutes: hoursToMinutes(openHour, openMinute),
    closeMinutes: hoursToMinutes(closeHour, closeMinute),
  });
  return slots.some((s) => s.available);
}

// Export de compatibilité
export const mockTimeSlots: TimeSlot[] = getFreshTimeSlots();
