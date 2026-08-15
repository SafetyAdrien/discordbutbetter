import { Type, Contrast, Eye, MousePointer2 } from 'lucide-react';
import { SettingsComingSoon } from './SettingsComingSoon';

export function AccessibilitySettings() {
  return (
    <SettingsComingSoon
      title="Accessibilité"
      intro="Bientôt disponible — les options d'accessibilité seront ajoutées au fil des versions."
      rows={[
        { icon: Type, label: 'Taille du texte', description: 'Ajuster la taille de police globale.' },
        { icon: Contrast, label: 'Contraste élevé', description: 'Renforcer le contraste des couleurs.' },
        { icon: Eye, label: 'Réduire les animations', description: 'Désactiver les transitions non essentielles.' },
        { icon: MousePointer2, label: 'Cible de clic agrandie', description: 'Agrandir les zones cliquables pour une navigation plus facile.' },
      ]}
    />
  );
}
