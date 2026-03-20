// Séries et défis mock pour la gamification fidélité

export interface Streak {
  id: string;
  type: 'streak' | 'challenge';
  title: string;
  description: string;
  progress: number; // 0-1
  current: number;
  target: number;
  reward: string;
  icon: string; // nom d'icône lucide
  completed: boolean;
}

export const mockStreaks: Streak[] = [
  {
    id: '1',
    type: 'streak',
    title: 'Série en cours',
    description: 'Commandez 5 jours consécutifs',
    progress: 0.6,
    current: 3,
    target: 5,
    reward: '500 pts bonus',
    icon: 'flame',
    completed: false,
  },
  {
    id: '2',
    type: 'streak',
    title: 'Amateur de thé',
    description: 'Commandez 10 boissons ce mois',
    progress: 0.7,
    current: 7,
    target: 10,
    reward: 'Boisson offerte',
    icon: 'coffee',
    completed: false,
  },
  {
    id: '3',
    type: 'challenge',
    title: 'Challenge Mars',
    description: '10 commandes ce mois',
    progress: 0.4,
    current: 4,
    target: 10,
    reward: 'Dessert offert',
    icon: 'trophy',
    completed: false,
  },
];
