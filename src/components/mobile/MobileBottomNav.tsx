import { cn } from '@/lib/utils';
import { Globe, Bell, User, MessageCircle } from 'lucide-react';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { motion } from 'framer-motion';
import { haptics } from '@/lib/haptics';

export type MobileTab = 'servers' | 'discuss' | 'notifications' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  /** When true, shows a tiny green dot near the Servers tab to signal an active voice connection. */
  voiceActive?: boolean;
}

const tabs: { id: MobileTab; label: string; icon: React.ElementType }[] = [
  { id: 'servers', label: 'Serveurs', icon: Globe },
  { id: 'discuss', label: 'Discuter', icon: MessageCircle },
  { id: 'notifications', label: 'Notifs', icon: Bell },
  { id: 'profile', label: 'Vous', icon: User },
];

export function MobileBottomNav({ activeTab, onTabChange, voiceActive = false }: MobileBottomNavProps) {
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-[hsl(var(--surface-1))] backdrop-blur-2xl border-t border-border/30 pb-[env(safe-area-inset-bottom,0px)]"
      style={{ boxShadow: 'var(--shadow-elevation-2)' }}
      aria-label="Navigation principale"
      role="navigation"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          const badge = getBadge(id);
          const badgeLabel = badge > 0 ? `, ${badge} non lu${badge > 1 ? 's' : ''}` : '';

          return (
            <button
              key={id}
              onClick={() => {
                if (activeTab !== id) haptics.selection();
                onTabChange(id);
              }}
              aria-label={`${label}${badgeLabel}`}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-300 relative min-w-[56px] min-h-[44px]',
              )}
              style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-pill"
                    className="absolute -inset-x-3 -inset-y-1 rounded-full bg-primary/12"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon className={cn(
                  "w-5 h-5 relative z-10 transition-colors duration-200",
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )} />
                {badge > 0 && (
                  <span aria-hidden="true" className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full shadow-sm">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-semibold transition-colors duration-200",
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>{label}</span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
