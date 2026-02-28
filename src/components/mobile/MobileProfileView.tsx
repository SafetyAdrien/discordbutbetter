import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Settings, LogOut, User, Moon, Pencil, Circle, MinusCircle, EyeOff } from 'lucide-react';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { CustomStatusModal } from '@/components/profile/CustomStatusModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'online', label: 'En ligne', icon: Circle, color: 'text-[hsl(var(--online))]', fill: 'fill-[hsl(var(--online))]' },
  { value: 'idle', label: 'Inactif', icon: Circle, color: 'text-[hsl(var(--idle))]', fill: 'fill-[hsl(var(--idle))]' },
  { value: 'dnd', label: 'Ne pas déranger', icon: MinusCircle, color: 'text-[hsl(var(--dnd))]', fill: '' },
  { value: 'offline', label: 'Invisible', icon: EyeOff, color: 'text-[hsl(var(--offline))]', fill: '' },
] as const;

export function MobileProfileView() {
  const { profile, signOut, user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsTab, setShowSettingsTab] = useState<'account' | 'profile'>('account');
  const [showStatus, setShowStatus] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const statusColors: Record<string, string> = {
    online: 'bg-[hsl(var(--online))]',
    idle: 'bg-[hsl(var(--idle))]',
    dnd: 'bg-[hsl(var(--dnd))]',
    offline: 'bg-[hsl(var(--offline))]',
  };

  const handleStatusChange = async (status: string) => {
    if (!user?.id) return;
    await supabase.from('profiles').update({ status }).eq('id', user.id);
    setStatusOpen(false);
  };

  const handleOpenSettings = (tab: 'account' | 'profile') => {
    setShowSettingsTab(tab);
    setShowSettings(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 flex items-center border-b border-border">
        <h2 className="font-semibold text-sm">Profil</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Banner */}
        {profile?.banner_url ? (
          <div className="h-28 w-full relative">
            <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
          </div>
        ) : (
          <div className="h-20 w-full bg-gradient-to-br from-primary/30 to-primary/10" />
        )}

        {/* Profile Card */}
        <div className="px-6 -mt-10 relative flex flex-col items-center">
          <div className="relative mb-3">
            <Avatar className="w-20 h-20 ring-4 ring-background">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-background ${statusColors[profile?.status || 'offline']}`} />
          </div>
          <h3 className="font-semibold text-lg">{profile?.display_name || 'Utilisateur'}</h3>
          <p className="text-sm text-muted-foreground">@{profile?.username}</p>
          {profile?.custom_status && (
            <p className="text-sm text-muted-foreground mt-1">{profile.custom_status}</p>
          )}
          {profile?.bio && (
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">{profile.bio}</p>
          )}

          {/* Status Selector */}
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button className="mt-3 px-4 py-1.5 rounded-full bg-muted/50 text-sm text-muted-foreground flex items-center gap-2 hover:bg-muted transition-colors">
                <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[profile?.status || 'offline'])} />
                {STATUS_OPTIONS.find(s => s.value === (profile?.status || 'offline'))?.label || 'Hors ligne'}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="center">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted',
                      profile?.status === opt.value && 'bg-muted'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', opt.color, opt.fill)} />
                    {opt.label}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions */}
        <div className="px-4 mt-6 space-y-1">
          <button
            onClick={() => setShowStatus(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Moon className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Définir un statut personnalisé</span>
          </button>
          <button
            onClick={() => handleOpenSettings('profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Pencil className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Modifier le profil</span>
          </button>
          <button
            onClick={() => handleOpenSettings('account')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Paramètres du compte</span>
          </button>
          <div className="h-px bg-border my-2" />
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>
      </div>

      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
      {showStatus && <CustomStatusModal open={showStatus} onOpenChange={setShowStatus} />}
    </div>
  );
}
