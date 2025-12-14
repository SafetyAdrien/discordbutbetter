import { cn } from '@/lib/utils';
import { Home, Bell, User } from 'lucide-react';

export type MobileTab = 'servers' | 'notifications' | 'profile';

interface MobileNavigationProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  unreadCount?: number;
}

export function MobileNavigation({ 
  activeTab, 
  onTabChange, 
  unreadCount = 0 
}: MobileNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 safe-area-pb">
      {/* Serveur */}
      <button
        onClick={() => onTabChange('servers')}
        className={cn(
          "flex flex-col items-center gap-1 p-2 transition-colors",
          activeTab === 'servers' ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Home className="w-6 h-6" />
        <span className="text-xs font-medium">Serveurs</span>
      </button>

      {/* Notifications */}
      <button
        onClick={() => onTabChange('notifications')}
        className={cn(
          "flex flex-col items-center gap-1 p-2 transition-colors relative",
          activeTab === 'notifications' ? "text-primary" : "text-muted-foreground"
        )}
      >
        <div className="relative">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs font-medium">Notifs</span>
      </button>

      {/* Profil */}
      <button
        onClick={() => onTabChange('profile')}
        className={cn(
          "flex flex-col items-center gap-1 p-2 transition-colors",
          activeTab === 'profile' ? "text-primary" : "text-muted-foreground"
        )}
      >
        <User className="w-6 h-6" />
        <span className="text-xs font-medium">Profil</span>
      </button>
    </nav>
  );
}
