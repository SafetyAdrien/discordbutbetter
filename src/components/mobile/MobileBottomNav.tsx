import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

export type MobileTab = 'servers' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  /** When true, shows a tiny green dot near the Servers tab to signal an active voice connection. */
  voiceActive?: boolean;
}

export function MobileBottomNav({ activeTab, onTabChange, voiceActive = false }: MobileBottomNavProps) {
  const { profile } = useAuth();
  const initial = (profile?.display_name || profile?.username || '?').charAt(0).toUpperCase();
  const currentStatus = profile?.status || 'offline';

  const tabs: { id: MobileTab; label: string }[] = [
    { id: 'servers', label: 'Serveurs' },
    { id: 'profile', label: 'Vous' },
  ];

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
        {tabs.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => {
                if (activeTab !== id) haptics.selection();
                onTabChange(id);
              }}
              aria-label={label}
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
                    className="absolute -inset-x-3 -inset-y-1.5 rounded-2xl bg-primary/15"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                {id === 'profile' ? (
                  <Avatar
                    className={cn(
                      'w-[24px] h-[24px] relative z-10 transition-all duration-200',
                      isActive ? 'ring-2 ring-primary' : 'ring-1 ring-border/40',
                    )}
                  >
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Globe
                    className={cn(
                      'w-[22px] h-[22px] relative z-10 transition-all duration-200',
                      isActive ? 'text-primary' : 'text-muted-foreground',
                    )}
                    strokeWidth={isActive ? 2.5 : 2.25}
                    fill={isActive ? 'currentColor' : 'none'}
                    fillOpacity={isActive ? 0.18 : 0}
                  />
                )}
                {voiceActive && id === 'servers' && (
                  <span
                    aria-label="Connecté en vocal"
                    title="Connecté en vocal"
                    className="absolute -bottom-0.5 -right-1 w-2 h-2 rounded-full bg-status-online ring-2 ring-[hsl(var(--surface-1))]"
                  />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-semibold transition-colors duration-200 relative z-10',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}>{label}</span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
