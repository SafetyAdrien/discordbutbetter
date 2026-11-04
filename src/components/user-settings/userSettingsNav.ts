import { Code2, Languages, MessageSquareLock, Palette, PersonStanding, ShieldCheck, UserRoundCog, type LucideIcon } from 'lucide-react';
import { Bell, Keyboard, Link2, Mic, User } from '@/components/icons/discord/lucide';

/*
 * Arborescence des Parametres utilisateur (Discord 2025) : groupes, pages et
 * sous-sections. Les sous-sections s'affichent sous la page active et suivent
 * le defilement ; elles servent aussi a la recherche.
 *
 * Absent volontairement : "Facturation" (Nitro, boosts, abonnements,
 * cadeaux), l'app n'ayant pas de paiement.
 */

export type UserSettingsPage =
  | 'profile'
  | 'account'
  | 'privacy'
  | 'messaging'
  | 'notifications'
  | 'voice'
  | 'appearance'
  | 'accessibility'
  | 'system'
  | 'language'
  | 'activity'
  | 'connections'
  | 'developer';

export interface NavPage {
  id: UserSettingsPage;
  label: string;
  icon: LucideIcon;
  sections: { id: string; label: string; keywords?: string }[];
}

export interface NavGroup {
  label: string | null;
  pages: NavPage[];
}

export const USER_SETTINGS_NAV: NavGroup[] = [
  {
    label: null,
    pages: [
      {
        id: 'account',
        label: 'Compte',
        icon: User,
        sections: [
          { id: 'account-info', label: 'Infos du compte', keywords: "nom d'utilisateur e-mail email téléphone" },
          { id: 'account-security', label: 'Mot de passe et sécurité', keywords: 'mot de passe a2f authentification appareils sessions' },
          { id: 'account-status', label: 'Statut du compte', keywords: 'âge groupe' },
          { id: 'account-family', label: 'Centre familial', keywords: 'désactiver supprimer compte' },
        ],
      },
      {
        id: 'privacy',
        label: 'Données et confidentialité',
        icon: ShieldCheck,
        sections: [
          { id: 'privacy-data', label: "Comment l'app utilise mes données" },
          { id: 'privacy-profile', label: 'Confidentialité du profil', keywords: 'profil complet' },
          { id: 'privacy-personal', label: 'Anniversaire et badges', keywords: 'anniversaire date de naissance badges capture' },
          { id: 'privacy-downloads', label: 'Téléchargements', keywords: 'autorisations télécharger médias' },
        ],
      },
      {
        id: 'messaging',
        label: 'Permissions de messagerie',
        icon: MessageSquareLock,
        sections: [
          { id: 'msg-filters', label: 'Filtres de contenu', keywords: 'contenu sensible explicite' },
          { id: 'msg-spam', label: 'Filtres de spam' },
          { id: 'msg-dms', label: 'Messages privés', keywords: 'mp' },
          { id: 'msg-friends', label: "Demandes d'amis" },
          { id: 'msg-games', label: 'Jeux connectés' },
        ],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        sections: [
          { id: 'notif-overview', label: "Vue d'ensemble", keywords: 'bureau' },
          { id: 'notif-sounds', label: 'Sons' },
          { id: 'notif-badges', label: 'Badges', keywords: 'non lus' },
          { id: 'notif-email', label: 'E-mail' },
          { id: 'notif-advanced', label: 'Avancés' },
        ],
      },
    ],
  },
  {
    label: 'Expérience',
    pages: [
      {
        id: 'voice',
        label: 'Voix & Vidéo',
        icon: Mic,
        sections: [
          { id: 'voice-voice', label: 'Voix', keywords: 'micro haut-parleur volume bruit écho appuyer pour parler' },
          { id: 'voice-camera', label: 'Caméra', keywords: 'vidéo webcam' },
          { id: 'voice-streaming', label: 'Streaming' },
          { id: 'voice-sounds', label: 'Sons' },
          { id: 'voice-soundboard', label: 'Soundboard' },
          { id: 'voice-advanced', label: 'Avancé', keywords: 'réinitialiser diagnostic' },
        ],
      },
      {
        id: 'appearance',
        label: 'Apparence',
        icon: Palette,
        sections: [
          { id: 'app-theme', label: 'Thème', keywords: 'clair sombre couleur' },
          { id: 'app-icon', label: "Icône de l'appli" },
          { id: 'app-messages', label: 'Messages', keywords: 'images vidéos liens réactions spoilers' },
          { id: 'app-chatbox', label: 'Boîte de discussion', keywords: 'markdown envoyer' },
          { id: 'app-search', label: 'Rechercher' },
          { id: 'app-streamer', label: 'Mode streamer' },
        ],
      },
      {
        id: 'accessibility',
        label: 'Accessibilité',
        icon: PersonStanding,
        sections: [
          { id: 'a11y-text', label: 'Lisibilité du texte', keywords: 'taille police souligner liens' },
          { id: 'a11y-density', label: 'Densité visuelle', keywords: 'compact espacement' },
          { id: 'a11y-color', label: 'Couleur et contraste', keywords: 'saturation contraste couleurs de rôle' },
          { id: 'a11y-motion', label: 'Mouvement réduit', keywords: 'animations' },
          { id: 'a11y-audio', label: "Audio et lecteur d'écran", keywords: 'synthèse vocale' },
        ],
      },
      {
        id: 'system',
        label: 'Système',
        icon: Keyboard,
        sections: [
          { id: 'sys-custom', label: 'Raccourcis clavier personnalisés' },
          { id: 'sys-default', label: 'Raccourcis clavier par défaut', keywords: 'raccourcis' },
          { id: 'sys-app', label: 'Application', keywords: 'installer cache markdown aide' },
        ],
      },
      { id: 'language', label: 'Langue et heure', icon: Languages, sections: [] },
    ],
  },
  {
    label: 'Jeux et applications',
    pages: [
      {
        id: 'activity',
        label: 'Confidentialité des activités',
        icon: UserRoundCog,
        sections: [
          { id: 'act-what', label: 'Quelle activité je partage' },
          { id: 'act-where', label: "Où je partage l'activité" },
          { id: 'act-join', label: 'Qui peut rejoindre mes parties ?' },
        ],
      },
      {
        id: 'connections',
        label: 'Applications connectées',
        icon: Link2,
        sections: [
          { id: 'conn-connections', label: 'Connexions' },
          { id: 'conn-apps', label: 'Applications autorisées' },
        ],
      },
    ],
  },
  {
    label: '',
    pages: [{ id: 'developer', label: 'Développeur', icon: Code2, sections: [] }],
  },
];

export const ALL_NAV_PAGES: NavPage[] = USER_SETTINGS_NAV.flatMap((g) => g.pages);

/** Anciens identifiants d'onglets (liens existants dans l'app). */
const LEGACY_TABS: Record<string, UserSettingsPage> = {
  my_profile: 'profile',
  account_security: 'account',
  privacy_safety: 'privacy',
  linked_accounts: 'connections',
  authorized_apps: 'connections',
  devices: 'account',
  appearance: 'appearance',
  keybinds: 'system',
  notifications: 'notifications',
  chat_settings: 'appearance',
  voice_video: 'voice',
  accessibility: 'accessibility',
  language: 'language',
  desktop_settings: 'system',
  advanced_settings: 'developer',
  'help-markdown': 'system',
};

export function resolveSettingsPage(tab: string | null | undefined): UserSettingsPage | null {
  if (!tab) return null;
  if (ALL_NAV_PAGES.some((p) => p.id === tab) || tab === 'profile') return tab as UserSettingsPage;
  return LEGACY_TABS[tab] ?? null;
}
