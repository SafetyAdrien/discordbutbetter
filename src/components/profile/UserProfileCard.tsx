import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Pencil, ChevronRight } from 'lucide-react';

const statusColors = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]'
};

const statusLabels = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Invisible'
};

interface UserProfileCardProps {
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  speakingUsers?: Set<string>;
}

export function UserProfileCard({ onOpenSettings, onOpenProfile, speakingUsers }: UserProfileCardProps) {
  const { profile, updateStatus } = useAuth();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const currentStatus = profile?.status || 'offline';

  const handleStatusChange = (status: 'online' | 'idle' | 'dnd' | 'offline') => {
    updateStatus(status);
    setShowStatusMenu(false);
  };

  return (
    <div className="h-[52px] px-2 flex items-center gap-2 bg-discord-userBar">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 flex-1 min-w-0 hover:bg-accent rounded p-1 transition-colors">
            <div className="relative">
              <Avatar className={cn(
                "w-8 h-8 transition-all",
                profile?.id && speakingUsers?.has(profile.id) 
                  ? "ring-2 ring-[hsl(var(--voice-active))] voice-active-ring" 
                  : "ring-2 ring-primary/30"
              )}>
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {profile?.display_name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
                statusColors[currentStatus]
              )} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{profile?.display_name || 'Chargement...'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.custom_status || statusLabels[currentStatus]}
              </p>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" side="top" className="w-72 p-0 overflow-hidden">
          {/* Profile Header with Banner */}
          <div className="relative">
            {profile?.banner_url ? (
              <img 
                src={profile.banner_url} 
                alt="Banner" 
                className="h-16 w-full object-cover" 
              />
            ) : (
              <div className="h-16 bg-gradient-to-r from-primary to-primary/50" />
            )}
            
            {/* Avatar overlapping banner */}
            <div className="absolute -bottom-6 left-3">
              <Avatar className="w-14 h-14 border-4 border-card">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-lg">
                  {profile?.display_name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card',
                statusColors[currentStatus]
              )} />
            </div>
          </div>

          {/* User Info */}
          <div className="pt-8 px-3 pb-3">
            <div className="mb-2">
              <p className="font-semibold text-foreground">{profile?.display_name}</p>
              <p className="text-xs text-muted-foreground">@{profile?.username?.toLowerCase()}</p>
            </div>

            {/* Edit Profile Button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mb-3"
              onClick={onOpenProfile}
            >
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Modifier profil
            </Button>

            <div className="border-t border-border pt-2 space-y-0.5">
              {/* Status Selector with Secondary Embed */}
              <div
                className="relative"
                onMouseEnter={() => setShowStatusMenu(true)}
                onMouseLeave={() => setShowStatusMenu(false)}
              >
                <button
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[currentStatus])} />
                    <span>{statusLabels[currentStatus]}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Secondary Status Embed */}
                {showStatusMenu && (
                  <div className="absolute left-full top-0 ml-1 w-44 bg-popover border border-border rounded-lg shadow-xl p-1.5 z-50 animate-slide-in-left">
                    <p className="text-xs text-muted-foreground px-2 py-1 mb-1">Définir le statut</p>
                    {(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                          currentStatus === status ? "bg-primary/20 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[status])} />
                        <span>{statusLabels[status]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Paramètres</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <button 
        onClick={onOpenSettings} 
        className="p-1.5 hover:bg-accent rounded transition-colors"
      >
        <Settings className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}