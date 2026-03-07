import { cn } from '@/lib/utils';
import { Globe, Bell, User } from 'lucide-react';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { motion } from 'framer-motion';

export type MobileTab = 'servers' | 'notifications' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const tabs: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: 'servers', label: 'Serveurs', icon: Globe },
  { id: 'notifications', label: 'Notifs', icon: Bell },
  { id: 'profile', label: 'Vous', icon: User },
];

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const notifCount = useUnreadNotificationsCount();

  const getBadge = (id: MobileTab) => {
    if (id === 'notifications' && notifCount > 0) return notifCount;
    return 0;
  };

  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      exit={{ y: 80 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-lg pb-safe"
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const badge = getBadge(id);

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors relative',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-indicator"
                  className="absolute -bottom-1 w-5 h-0.5 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
