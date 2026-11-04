/** "Mentionner" depuis un menu (membres, profils) : le champ de saisie du salon ouvert ajoute la mention. */
export const MENTION_USER_EVENT = 'app:mention-user';
export interface MentionUserDetail {
  userId: string;
  name: string;
}
