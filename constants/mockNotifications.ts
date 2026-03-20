// Notifications mock pour l'application Teaven

export interface AppNotification {
  id: string;
  type: 'order' | 'promo' | 'loyalty' | 'system';
  title: string;
  description: string;
  timestamp: string; // ISO string
  read: boolean;
}

export const mockNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    type: 'order',
    title: 'Votre commande #T-2847 est prête !',
    description: 'Vous pouvez venir la récupérer au comptoir.',
    timestamp: '2026-03-20T14:27:00Z',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'order',
    title: 'Commande #T-2845 en préparation',
    description: 'Votre commande sera prête dans environ 10 minutes.',
    timestamp: '2026-03-20T14:05:00Z',
    read: true,
  },
  {
    id: 'notif-3',
    type: 'promo',
    title: 'Happy Hour -20% sur les boissons',
    description: 'Profitez de -20% sur toutes les boissons entre 15h et 17h aujourd\'hui !',
    timestamp: '2026-03-20T12:30:00Z',
    read: false,
  },
  {
    id: 'notif-4',
    type: 'loyalty',
    title: 'Bravo ! Vous passez au niveau Or',
    description: 'Félicitations, vous avez atteint 500 points et débloqué le niveau Or.',
    timestamp: '2026-03-19T10:00:00Z',
    read: false,
  },
  {
    id: 'notif-5',
    type: 'promo',
    title: 'Parrainez un ami, gagnez 200 pts',
    description: 'Invitez un ami à rejoindre Teaven et recevez chacun 200 points de fidélité.',
    timestamp: '2026-03-19T09:00:00Z',
    read: true,
  },
  {
    id: 'notif-6',
    type: 'system',
    title: 'Mise à jour de nos CGU',
    description: 'Nos conditions générales d\'utilisation ont été mises à jour. Consultez-les dans les paramètres.',
    timestamp: '2026-03-18T08:00:00Z',
    read: true,
  },
  {
    id: 'notif-7',
    type: 'loyalty',
    title: '+15 points pour votre dernière commande',
    description: 'Votre commande #T-2843 vous a rapporté 15 points de fidélité.',
    timestamp: '2026-03-18T14:30:00Z',
    read: true,
  },
  {
    id: 'notif-8',
    type: 'promo',
    title: 'Nouveau : Matcha Zen Latte Glacé',
    description: 'Découvrez notre nouvelle boisson signature au matcha de cérémonie et lait d\'avoine.',
    timestamp: '2026-03-17T10:00:00Z',
    read: true,
  },
];
