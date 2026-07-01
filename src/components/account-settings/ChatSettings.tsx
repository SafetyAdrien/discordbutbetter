import { MessageSquare, Image, Link, Smile } from 'lucide-react';
import { SettingsComingSoon } from './SettingsComingSoon';

export function ChatSettings() {
  return (
    <SettingsComingSoon
      title="Chat"
      intro="Bientôt disponible — les préférences de chat seront ajoutées progressivement."
      rows={[
        { icon: MessageSquare, label: 'Mode compact', description: 'Réduire les espacements entre les messages.' },
        { icon: Image, label: 'Aperçu des images', description: 'Afficher automatiquement les images des liens.' },
        { icon: Link, label: 'Aperçu des liens', description: 'Générer un aperçu enrichi pour les URLs.' },
        { icon: Smile, label: 'Emojis animés', description: 'Autoriser la lecture des GIFs et emojis animés.' },
      ]}
    />
  );
}
