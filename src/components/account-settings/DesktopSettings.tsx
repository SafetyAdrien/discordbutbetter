import { Download, PlayCircle, Minimize2, Zap } from 'lucide-react';
import { SettingsComingSoon } from './SettingsComingSoon';

export function DesktopSettings() {
  return (
    <SettingsComingSoon
      title="Application desktop"
      intro="Bientôt disponible — l'application desktop native est en cours de préparation."
      rows={[
        { icon: Download, label: 'Installer sur cet appareil', description: 'Installer NexusChat en tant qu\'application autonome.' },
        { icon: PlayCircle, label: 'Lancer au démarrage', description: 'Ouvrir NexusChat automatiquement à l\'ouverture de session.' },
        { icon: Minimize2, label: 'Minimiser dans la barre système', description: 'Continuer à recevoir les notifications en tâche de fond.' },
        { icon: Zap, label: 'Accélération matérielle', description: 'Utiliser le GPU pour le rendu quand disponible.' },
      ]}
    />
  );
}
