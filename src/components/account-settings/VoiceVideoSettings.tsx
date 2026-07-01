import { Mic, Volume2, Video, Radio, Waves } from 'lucide-react';
import { SettingsComingSoon } from './SettingsComingSoon';

export function VoiceVideoSettings() {
  return (
    <SettingsComingSoon
      title="Voix & vidéo"
      intro="Bientôt disponible — les réglages persistants viendront compléter le panneau de configuration en appel."
      rows={[
        { icon: Mic, label: 'Périphérique d\'entrée', description: 'Choisir un micro par défaut.' },
        { icon: Volume2, label: 'Périphérique de sortie', description: 'Choisir un haut-parleur ou casque par défaut.' },
        { icon: Video, label: 'Caméra', description: 'Sélectionner la caméra par défaut pour la vidéo.' },
        { icon: Waves, label: 'Suppression de bruit', description: 'Activer RNNoise par défaut sur toutes les connexions.' },
        { icon: Radio, label: 'Mode Push-to-Talk', description: 'Assigner un raccourci pour parler à la demande.' },
      ]}
    />
  );
}
