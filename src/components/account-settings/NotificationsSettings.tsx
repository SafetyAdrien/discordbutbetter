import { Bell, Mail, Volume2, MonitorSmartphone } from 'lucide-react';
import { SettingsComingSoon } from './SettingsComingSoon';

export function NotificationsSettings() {
  return (
    <SettingsComingSoon
      title="Notifications"
      intro="Bientôt disponible — le système de notifications est en cours de construction."
      rows={[
        { icon: Bell, label: 'Notifications de bureau', description: 'Recevoir une alerte système pour les mentions et les messages directs.' },
        { icon: Volume2, label: 'Sons de notification', description: 'Choisir un son personnalisé pour les mentions.' },
        { icon: Mail, label: 'Notifications par e-mail', description: 'Résumé quotidien des messages manqués.' },
        { icon: MonitorSmartphone, label: 'Par appareil', description: 'Régler indépendamment desktop, mobile et web.' },
      ]}
    />
  );
}
