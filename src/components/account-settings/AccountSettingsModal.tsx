import { UserSettingsModal } from '@/components/user-settings/UserSettingsModal';

/*
 * Point d'entree historique des Parametres utilisateur : redirige vers la
 * nouvelle fenetre (Discord 2025). `initialTab` accepte les nouveaux
 * identifiants de page et les anciens noms d'onglets.
 */
interface AccountSettingsModalProps {
  onClose: () => void;
  initialTab?: string | null;
}

export function AccountSettingsModal({ onClose, initialTab }: AccountSettingsModalProps) {
  return <UserSettingsModal onClose={onClose} initialTab={initialTab} />;
}
