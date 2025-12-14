import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, LogOut, User, Calendar } from 'lucide-react';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function MobileProfilePanel() {
  const { user, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const statusColors = {
    online: 'bg-[hsl(var(--online))]',
    idle: 'bg-[hsl(var(--idle))]',
    dnd: 'bg-[hsl(var(--dnd))]',
    offline: 'bg-[hsl(var(--offline))]',
  };

  const statusLabels = {
    online: 'En ligne',
    idle: 'Inactif',
    dnd: 'Ne pas déranger',
    offline: 'Hors ligne',
  };

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Mon profil</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Banner */}
          <div 
            className="h-24 rounded-t-xl bg-gradient-to-br from-primary/40 to-primary/20"
            style={profile?.banner_url ? {
              backgroundImage: `url(${profile.banner_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          />

          {/* Profile Info */}
          <div className="relative px-4 pb-4 bg-card rounded-b-xl -mt-8">
            <div className="flex items-end gap-4">
              <div className="relative -mt-8">
                <Avatar className="w-20 h-20 border-4 border-card">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span 
                  className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-card ${statusColors[profile?.status || 'offline']}`}
                />
              </div>
              <div className="flex-1 pt-10">
                <h3 className="text-xl font-bold">{profile?.display_name}</h3>
                <p className="text-sm text-muted-foreground">@{profile?.username?.toLowerCase()}</p>
              </div>
            </div>

            {/* Status */}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${statusColors[profile?.status || 'offline']}`} />
                <span className="text-sm font-medium">
                  {statusLabels[profile?.status || 'offline']}
                </span>
              </div>
              {profile?.custom_status && (
                <p className="mt-2 text-sm text-muted-foreground">{profile.custom_status}</p>
              )}
            </div>

            {/* Bio */}
            {profile?.bio && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">À propos de moi</h4>
                <p className="text-sm">{profile.bio}</p>
              </div>
            )}

            {/* Member since */}
            {profile?.created_at && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Membre depuis {format(new Date(profile.created_at), 'MMMM yyyy', { locale: fr })}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Paramètres du compte
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </ScrollArea>

      {showSettings && (
        <AccountSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
