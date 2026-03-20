// Créneaux horaires mock pour la commande à emporter

export interface TimeSlot {
  id: string;
  label: string; // "14:00 - 14:15"
  available: boolean;
  ordersInQueue: number;
}

/**
 * Génère les créneaux de 11h00 à 20h00 par tranches de 15 minutes.
 * Les créneaux avant 14h30 (heure simulée actuelle) sont indisponibles.
 */
function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Premier créneau spécial : dès que possible
  slots.push({
    id: 'asap',
    label: 'Dès que possible',
    available: true,
    ordersInQueue: 3,
  });

  const startHour = 11;
  const endHour = 20;
  const nowHour = 14;
  const nowMinute = 30;

  let slotIndex = 1;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const endMinute = minute + 15;
      const endH = endMinute >= 60 ? hour + 1 : hour;
      const endM = endMinute >= 60 ? 0 : endMinute;

      const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // Indisponible si le créneau est avant l'heure actuelle (14h30)
      const isPast = hour < nowHour || (hour === nowHour && minute < nowMinute);

      // Simuler un nombre de commandes en file pour les créneaux disponibles
      const ordersInQueue = isPast ? 0 : Math.floor(Math.random() * 6);

      slots.push({
        id: `slot-${slotIndex}`,
        label,
        available: !isPast,
        ordersInQueue,
      });

      slotIndex++;
    }
  }

  return slots;
}

export const mockTimeSlots: TimeSlot[] = generateTimeSlots();
