import { Languages, Clock, CalendarDays } from 'lucide-react';
import { SettingsComingSoon } from './SettingsComingSoon';

export function LanguageSettings() {
  return (
    <SettingsComingSoon
      title="Langue"
      intro="Bientôt disponible — NexusChat est actuellement uniquement disponible en français. Un système multilingue est prévu."
      rows={[
        { icon: Languages, label: 'Langue de l\'interface', description: 'Choisir la langue d\'affichage.' },
        { icon: Clock, label: 'Format d\'heure', description: 'Basculer entre 12 h et 24 h.' },
        { icon: CalendarDays, label: 'Format de date', description: 'Sélectionner un format régional.' },
      ]}
    />
  );
}
