// Articles mock pour le blog Atmosphère
export interface BlogArticleFull {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: 'nutrition' | 'bien-etre' | 'lifestyle';
  author: string;
  readTime: number;
  imageUrl: string;
  publishedAt: string;
  featured: boolean;
}

export const mockArticles: BlogArticleFull[] = [
  {
    id: '1',
    title: 'Les bienfaits du matcha sur la concentration',
    excerpt:
      'Découvrez comment le matcha peut améliorer votre focus et votre énergie au quotidien grâce à sa teneur unique en L-théanine.',
    content: `Le matcha, cette poudre de thé vert d'un vert éclatant, est bien plus qu'une tendance. Utilisé depuis des siècles dans la cérémonie du thé japonaise, il recèle des propriétés fascinantes pour notre cerveau.

Contrairement au café, le matcha contient de la L-théanine, un acide aminé qui favorise un état de concentration calme. Pas de pic d'énergie brutal suivi d'un crash — plutôt une montée douce et prolongée qui vous accompagne tout au long de la matinée.

Les études montrent que la combinaison caféine + L-théanine améliore significativement l'attention, la mémoire de travail et le temps de réaction. C'est ce qui rend le matcha si unique : il vous rend alerte sans vous rendre nerveux.

Notre conseil : commencez votre journée avec un matcha latte préparé avec du lait d'avoine et une touche de sirop d'érable. Votre cerveau vous remerciera.`,
    category: 'bien-etre',
    author: 'Éléonore V.',
    readTime: 5,
    imageUrl:
      'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&h=400&fit=crop',
    publishedAt: '15 mars 2026',
    featured: true,
  },
  {
    id: '2',
    title: 'Meal prep : organiser ses repas healthy pour la semaine',
    excerpt:
      'Nos conseils pour préparer vos repas de la semaine en toute sérénité et gagner du temps chaque jour.',
    content: `Le meal prep, c'est l'art de préparer ses repas à l'avance. Et contrairement à ce qu'on pourrait penser, ce n'est pas réservé aux sportifs ou aux nutritionnistes. C'est avant tout une question d'organisation.

Commencez simple : choisissez 3 recettes pour la semaine, faites vos courses le dimanche matin, et consacrez 2 heures en cuisine l'après-midi. Investissez dans de bons contenants en verre — c'est plus sain et plus agréable que le plastique.

La clé, c'est la variété des textures et des saveurs. Préparez une base (quinoa, riz complet, patates douces), une protéine (pois chiches, tofu, poulet), et des légumes colorés. Ajoutez les sauces et toppings au dernier moment pour garder la fraîcheur.

Chez Teaven, nos bowls sont pensés exactement comme ça : une base nutritive, des légumes de saison, et une touche de créativité qui fait la différence.`,
    category: 'nutrition',
    author: 'Sophie M.',
    readTime: 7,
    imageUrl:
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop',
    publishedAt: '10 mars 2026',
    featured: false,
  },
  {
    id: '3',
    title: '5 rituels du matin pour démarrer en douceur',
    excerpt:
      'Des habitudes simples pour des matins sereins qui transforment votre journée entière.',
    content: `On dit souvent que la façon dont vous commencez votre journée détermine son cours. Voici 5 rituels que nous avons adoptés et qui changent vraiment la donne.

1. Hydratez-vous immédiatement. Avant le café, buvez un grand verre d'eau tiède avec un filet de citron. Votre corps est déshydraté après la nuit.

2. Prenez 5 minutes pour respirer. Pas besoin de méditer pendant une heure. Asseyez-vous, fermez les yeux, respirez profondément 10 fois. C'est tout.

3. Bougez doucement. Quelques étirements, une courte marche, ou même danser sur votre chanson préférée. L'idée est de réveiller votre corps en douceur.

4. Préparez un petit-déjeuner nourrissant. Prenez le temps de savourer un vrai repas, pas un croissant avalé debout. Un bowl de fruits, du granola maison, un thé.

5. Fixez votre intention. Qu'est-ce qui compte vraiment aujourd'hui ? Une seule chose. Écrivez-la et gardez-la en tête.`,
    category: 'lifestyle',
    author: 'Camille D.',
    readTime: 4,
    imageUrl:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop',
    publishedAt: '5 mars 2026',
    featured: false,
  },
  {
    id: '4',
    title: 'Le guide complet des super-aliments',
    excerpt:
      'Quels sont les vrais super-aliments et comment les intégrer facilement dans votre alimentation quotidienne.',
    content: `Le terme "super-aliment" est partout, mais que signifie-t-il vraiment ? En réalité, il n'existe pas de définition scientifique officielle. Ce sont simplement des aliments particulièrement riches en nutriments.

Les baies de goji, les graines de chia, la spiruline... certains sont devenus des stars. Mais les vrais champions sont souvent plus proches de nous : les myrtilles, les noix, le brocoli, l'ail, les lentilles.

L'important n'est pas de courir après les dernières tendances, mais d'avoir une alimentation variée et colorée. Chaque couleur dans votre assiette représente un type de nutriment différent.

Notre astuce : ajoutez des graines (chia, lin, courge) à vos bowls du matin. Un petit geste, un grand impact nutritionnel.`,
    category: 'nutrition',
    author: 'Hugo L.',
    readTime: 8,
    imageUrl:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop',
    publishedAt: '1 mars 2026',
    featured: false,
  },
  {
    id: '5',
    title: 'Digital detox : retrouver le calme intérieur',
    excerpt:
      'Comment réduire le temps d\'écran et reconnecter avec l\'essentiel en quelques étapes simples.',
    content: `En moyenne, nous passons plus de 4 heures par jour sur nos smartphones. Ce flux constant d'informations, de notifications et de stimulations épuise notre cerveau et nuit à notre bien-être.

La digital detox n'est pas une question de tout arrêter. C'est une question de choix conscients. Commencez par désactiver les notifications non essentielles. Créez des zones sans téléphone : la table du repas, la chambre.

Remplacez le scroll par des activités nourrissantes : lire un livre, dessiner, cuisiner, marcher dans la nature. Vous serez surpris de voir à quel point le temps s'étire quand on lâche son téléphone.

Le soir, essayez de poser votre téléphone une heure avant le coucher. Préparez-vous un thé, lisez quelques pages. Votre sommeil s'en trouvera transformé.`,
    category: 'bien-etre',
    author: 'Éléonore V.',
    readTime: 6,
    imageUrl:
      'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=600&h=400&fit=crop',
    publishedAt: '25 février 2026',
    featured: false,
  },
  {
    id: '6',
    title: 'Créer un espace cocooning chez soi',
    excerpt:
      'Transformez votre intérieur en havre de paix avec ces astuces déco et ambiance simples à mettre en place.',
    content: `Votre chez-vous devrait être votre refuge. Un endroit où vous pouvez vous ressourcer, lâcher prise, et simplement être. Voici comment créer cette atmosphère cocooning.

La lumière est essentielle. Privilégiez les lumières chaudes et tamisées le soir. Des bougies, des guirlandes, une lampe de sel — tout ce qui crée une ambiance douce et enveloppante.

Les textures comptent énormément. Un plaid en lin, des coussins moelleux, un tapis doux sous les pieds. Le toucher influence directement notre niveau de stress.

Les plantes apportent de la vie et purifient l'air. Pas besoin d'avoir la main verte : un pothos, un philodendron ou un cactus demandent très peu d'entretien.

Enfin, les odeurs. Un diffuseur avec quelques gouttes d'huile essentielle de lavande ou d'eucalyptus transforme instantanément l'atmosphère d'une pièce.`,
    category: 'lifestyle',
    author: 'Camille D.',
    readTime: 5,
    imageUrl:
      'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=600&h=400&fit=crop',
    publishedAt: '20 février 2026',
    featured: false,
  },
];
