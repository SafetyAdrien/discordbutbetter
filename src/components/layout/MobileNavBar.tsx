import { cn } from '@/lib/utils';
import { MessageSquare, Users, Menu, Home } from 'lucide-react';

interface MobileNavBarProps {
  onOpenLeft: () => void;
  onOpenRight: () => void;
  isHomeView: boolean;
  showMembersButton?: boolean;
}

export function MobileNavBar({ 
  onOpenLeft, 
  onOpenRight, 
  isHomeView,
  showMembersButton = true 
}: MobileNavBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border flex items-center justify-around z-50 safe-area-bottom">
      {/* Left drawer button (Servers + Channels) */}
      <button 
        onClick={onOpenLeft}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-medium">Serveurs</span>
      </button>

      {/* Home / Chat indicator */}
      <div className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full">
        {isHomeView ? (
          <>
            <Home className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-medium text-primary">Accueil</span>
          </>
        ) : (
          <>
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-medium text-primary">Discussion</span>
          </>
        )}
      </div>

      {/* Right drawer button (Members) */}
      {showMembersButton && (
        <button 
          onClick={onOpenRight}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Membres</span>
        </button>
      )}
    </div>
  );
}
