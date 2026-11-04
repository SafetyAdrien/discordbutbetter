/*
 * Textes et categories de la page "Decouvrir" (video de reference) : onglets, titres de banniere et sous-titres.
 */

export type DiscoverSection = 'servers' | 'apps';

export interface DiscoverTab {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  /** Titre de la rangee de resultats sous la banniere. */
  rowTitle?: string;
}

export const SERVER_TABS: DiscoverTab[] = [
  { id: 'home', label: 'Accueil', title: 'Trouve ta communauté sur Discord', subtitle: 'Des jeux vidéo à la pédagogie, en passant par la musique, tu trouveras toujours chaussure à ton pied.', rowTitle: 'Serveurs du moment' },
  { id: 'gaming', label: 'Gaming', title: 'Gaming', subtitle: 'Obtiens des mises à jour, connecte-toi avec les développeurs et discute avec d\'autres joueurs et joueuses.', rowTitle: 'Serveurs gaming populaires' },
  { id: 'music', label: 'Musique', title: 'Musique', subtitle: 'Reçois des mises à jour, discute avec des artistes et discute avec d\'autres fans de musique.', rowTitle: 'Serveurs de musique populaires' },
  { id: 'entertainment', label: 'Divertissement', title: 'Divertissement', subtitle: 'Connecte-toi avec tes créatrices et créateurs préférés et avec leurs fans.', rowTitle: 'Serveurs de divertissement populaires' },
  { id: 'science_tech', label: 'Science et technologie', title: 'Science et technologie', subtitle: 'Connecte-toi avec des développeurs, des passionnés et des entreprises de technologie.', rowTitle: 'Serveurs de science et technologie populaires' },
  { id: 'education', label: 'Éducation', title: 'Éducation', subtitle: 'Connecte-toi avec des étudiants, des enseignants et des centres d\'apprentissage.', rowTitle: 'Serveurs d\'éducation populaires' },
  { id: 'hubs', label: 'Pôles étudiants', title: 'Rejoins le pôle étudiant de ton établissement scolaire', subtitle: 'Rencontre d\'autres étudiants de ton école, découvre des communautés et partage tes serveurs.' },
];

export const APP_TABS: DiscoverTab[] = [
  { id: 'home', label: 'En ce moment', title: 'Trouve des choses à faire ensemble', subtitle: 'Rends tes moments entre amis encore plus fun avec des applications de jeux, de musique, d\'outils créatifs et bien plus encore.' },
  { id: 'games', label: 'Jeux', title: 'Jeux', subtitle: 'Plonge dans des puzzles solo, des jeux de groupe, des affrontements compétitifs, et plus encore.' },
  { id: 'entertainment', label: 'Divertissements', title: 'Divertissements', subtitle: 'Regardez des vidéos, écoutez de la musique et partagez des moments ensemble.' },
  { id: 'moderation', label: 'Modération et Outils', title: 'Modération et outils', subtitle: 'Construis, gère et développe une communauté florissante.' },
  { id: 'social', label: 'Social', title: 'Social', subtitle: 'Rassemblez-vous, suscitez des conversations et créez des connexions.' },
  { id: 'services', label: 'Services', title: 'Services', subtitle: 'Ajoute de la commodité, de l\'organisation et de la productivité à tes conversations.' },
];

export const APP_CATEGORY_LABEL: Record<string, string> = {
  games: 'Jeux',
  entertainment: 'Divertissements',
  moderation: 'Modération et Outils',
  social: 'Social',
  services: 'Services',
};

/** Categories proposees aux administrateurs d'un serveur (page Acces). */
export const SERVER_CATEGORY_OPTIONS = SERVER_TABS.filter((t) => !['home', 'hubs'].includes(t.id)).map((t) => ({ value: t.id, label: t.label }));
