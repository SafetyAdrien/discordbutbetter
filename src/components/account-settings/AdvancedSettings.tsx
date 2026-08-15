import { Terminal, Bug, Database, FlaskConical } from 'lucide-react';
import { SettingsComingSoon } from './SettingsComingSoon';

export function AdvancedSettings() {
  return (
    <SettingsComingSoon
      title="Avancé"
      intro="Bientôt disponible — les options avancées sont réservées aux utilisateurs expérimentés."
      rows={[
        { icon: Terminal, label: 'Mode développeur', description: 'Activer les logs détaillés et les outils internes.' },
        { icon: Bug, label: 'Rapport de bug', description: 'Exporter un diagnostic pour l\'envoyer au support.' },
        { icon: Database, label: 'Vider le cache local', description: 'Réinitialiser les données mises en cache dans ce navigateur.' },
        { icon: FlaskConical, label: 'Fonctionnalités expérimentales', description: 'Tester en avant-première les nouveautés en cours de développement.' },
      ]}
    />
  );
}
