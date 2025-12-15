import { Home, Compass, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeView: 'home' | 'servers' | 'members' | 'settings';
  onOpenHome: () => void;
  onOpenServers: () => void;
  onOpenMembers: () => void;
  onOpenSettings: () => void;
  showMembersButton?: boolean;
}

export function MobileBottomNav({
  activeView,
  onOpenHome,
  onOpenServers,
  onOpenMembers,
  onOpenSettings,
  showMembersButton = true,
}: MobileBottomNavProps) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Accueil', onClick: onOpenHome },
    { id: 'servers', icon: Compass, label: 'Serveurs', onClick: onOpenServers },
    ...(showMembersButton ? [{ id: 'members', icon: Users, label: 'Membres', onClick: onOpenMembers }] : []),
    { id: 'settings', icon: Settings, label: 'Paramètres', onClick: onOpenSettings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-safe">
      <div className="mb-3 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg">
        <nav className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[44px] min-h-[44px] transition-all duration-200',
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn(
                  'w-5 h-5 transition-transform duration-200',
                  isActive && 'scale-110'
                )} />
                <span className={cn(
                  'text-[10px] font-medium',
                  isActive && 'text-primary'
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
