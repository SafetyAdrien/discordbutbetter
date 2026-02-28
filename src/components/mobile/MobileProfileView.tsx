import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Settings, LogOut, User, Moon } from 'lucide-react';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { CustomStatusModal } from '@/components/profile/CustomStatusModal';

export function MobileProfileView() {
  const { user, profile, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  const statusColors: Record<string, string> = {
    online: 'bg-[hsl(var(--online))]',
    idle: 'bg-[hsl(var(--idle))]',
    dnd: 'bg-[hsl(var(--dnd))]',
    offline: 'bg-[hsl(var(--offline))]',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 flex items-center border-b border-border">
        <h2 className="font-semibold text-sm">Profil</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Profile Card */}
        <div className="p-6 flex flex-col items-center">
          <div className="relative mb-3">
            <Avatar className="w-20 h-20">
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
        </div>

        {/* Actions */}
        <div className="px-4 space-y-1">
          <button
            onClick={() => setShowStatus(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Moon className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Définir un statut</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Paramètres du compte</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Modifier le profil</span>
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
      {showStatus && <CustomStatusModal onClose={() => setShowStatus(false)} />}
    </div>
  );
}
