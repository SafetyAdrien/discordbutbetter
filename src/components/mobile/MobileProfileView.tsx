import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Settings,
  Pencil,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { MobileStatusSheet } from './profile/MobileStatusSheet';
import { MobileEditProfileView } from './profile/MobileEditProfileView';
import { MobileQRCodeView } from './profile/MobileQRCodeView';
import { MobileFavoriteFriendsView } from './profile/MobileFavoriteFriendsView';
import { MobileServersListView } from './profile/MobileServersListView';
import { MobileSettingsRedirectView } from './profile/MobileSettingsRedirectView';
import { MobileFullProfileView } from './profile/MobileFullProfileView';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { uuidToSnowflake } from '@/lib/snowflake';
import { useFriends } from '@/hooks/useFriends';
import { useServers } from '@/hooks/useServers';

type Subpage =
  | null
  | 'profile-detail'
  | 'edit-profile'
  | 'qr-code'
  | 'friends'
  | 'servers'
  | 'notifications'
  | 'appearance'
  | 'privacy';

const STATUS_LABELS: Record<string, string> = {
  online: 'En ligne',
  idle: 'Inactif',
  dnd: 'Ne pas déranger',
  offline: 'Invisible',
};

interface MobileProfileViewProps {
  onOpenDM?: (conversationId: string) => void;
  onSelectServer?: (serverId: string) => void;
  onCreateServer?: () => void;
  onDiscover?: () => void;
}

export function MobileProfileView({
  onOpenDM,
  onSelectServer,
}: MobileProfileViewProps = {}) {
  const { profile, user } = useAuth();
  const { data: friends = [] } = useFriends();
  const { data: servers = [] } = useServers();
  const [showSettings, setShowSettings] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subpage, setSubpage] = useState<Subpage>(null);

  const acceptedFriends = friends.filter((f: any) => f.status === 'accepted').length;
  const serverCount = servers.length;

  const statusColors: Record<string, string> = {
    online: 'bg-[hsl(var(--online))]',
    idle: 'bg-[hsl(var(--idle))]',
    dnd: 'bg-[hsl(var(--dnd))]',
    offline: 'bg-[hsl(var(--offline))]',
  };

  const handleOpenSettings = () => {
    haptics.light();
    setShowSettings(true);
  };

  const handleCopyId = async () => {
    if (!user?.id) return;
    haptics.light();
    const snowflake = uuidToSnowflake(user.id);
    await navigator.clipboard.writeText(snowflake);
    setCopied(true);
    toast.success('Identifiant copié');
    setTimeout(() => setCopied(false), 1500);
  };

  const initial = profile?.display_name?.charAt(0)?.toUpperCase() || '?';
  const currentStatus = profile?.status || 'offline';

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-border shrink-0">
        <h1 className="font-semibold text-base">Toi</h1>
        <div className="w-9 h-9 -mr-2" />
      </header>

      <div className="flex-1 overflow-y-auto pb-8" style={{ overscrollBehavior: 'contain' }}>
        {/* Hero — Banner + Avatar */}
        <section className="relative">
          {profile?.banner_url ? (
            <div className="h-32 w-full">
              <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div
              className="h-24 w-full"
              style={{
                background: profile?.theme_color
                  ? `linear-gradient(135deg, ${profile.theme_color}, hsl(var(--primary)))`
                  : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))',
              }}
            />
          )}

          <button
            onClick={handleOpenSettings}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/75 backdrop-blur-md flex items-center justify-center active:bg-background/90 transition-colors"
            aria-label="Paramètres"
          >
            <Settings className="w-5 h-5 text-foreground" />
          </button>

          {/* Avatar + Edit btn */}
          <div className="px-4 -mt-12 relative">
            <div className="flex items-end justify-between">
              <button
                onClick={() => {
                  haptics.light();
                  setShowStatusSheet(true);
                }}
                className="relative active:opacity-80 transition-opacity"
                aria-label="Changer le statut"
              >
                <Avatar className="w-24 h-24 ring-[5px] ring-background">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute bottom-1 right-1 w-6 h-6 rounded-full border-[4px] border-background',
                    statusColors[currentStatus]
                  )}
                />
              </button>

              <button
                onClick={() => {
                  haptics.light();
                  setSubpage('edit-profile');
                }}
                className="mb-2 px-4 h-9 rounded-full bg-muted/60 text-sm font-medium active:bg-muted transition-colors flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
            </div>
          </div>
        </section>

        {/* Identity card with status trigger on display name */}
        <section className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <button
                onClick={() => {
                  haptics.light();
                  setShowStatusSheet(true);
                }}
                className="flex items-center gap-2 max-w-full text-left active:opacity-70 transition-opacity"
                aria-label="Changer le statut"
              >
                <h2 className="font-bold text-xl truncate">
                  {profile?.display_name || 'Utilisateur'}
                </h2>
                <div className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-muted/60">
                  <div
                    className={cn('w-2 h-2 rounded-full', statusColors[currentStatus])}
                  />
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </button>
              <p className="text-sm text-muted-foreground truncate">@{profile?.username}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                {STATUS_LABELS[currentStatus]}
              </p>
              {profile?.pronouns && (
                <p className="text-xs text-muted-foreground mt-0.5">{profile.pronouns}</p>
              )}
            </div>
            <button
              onClick={handleCopyId}
              className="shrink-0 w-9 h-9 rounded-full active:bg-muted/60 transition-colors flex items-center justify-center"
              aria-label="Copier l'identifiant"
            >
              {copied ? (
                <Check className="w-4 h-4 text-[hsl(var(--online))]" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {profile?.custom_status && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-muted/40 text-sm">
              {profile.custom_status}
            </div>
          )}

          {profile?.bio && (
            <p className="text-sm text-foreground/80 mt-3 whitespace-pre-wrap leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                haptics.light();
                setSubpage('friends');
              }}
              className="rounded-xl bg-muted/40 px-3 py-2.5 text-center active:bg-muted/60 transition-colors"
            >
              <div className="font-semibold text-base leading-none">{acceptedFriends}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {acceptedFriends > 1 ? 'Amis' : 'Ami'}
              </div>
            </button>
            <button
              onClick={() => {
                haptics.light();
                setSubpage('servers');
              }}
              className="rounded-xl bg-muted/40 px-3 py-2.5 text-center active:bg-muted/60 transition-colors"
            >
              <div className="font-semibold text-base leading-none">{serverCount}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {serverCount > 1 ? 'Serveurs' : 'Serveur'}
              </div>
            </button>
          </div>
        </section>

        <div className="h-6" />
      </div>

      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} initialTab={null} />}

      <MobileStatusSheet open={showStatusSheet} onOpenChange={setShowStatusSheet} />

      {/* Sub-pages stack */}
      <AnimatePresence>
        {subpage === 'profile-detail' && (
          <MobileFullProfileView key="profile-detail" onBack={() => setSubpage(null)} />
        )}
        {subpage === 'edit-profile' && (
          <MobileEditProfileView key="edit" onBack={() => setSubpage(null)} />
        )}
        {subpage === 'qr-code' && (
          <MobileQRCodeView key="qr" onBack={() => setSubpage(null)} />
        )}
        {subpage === 'friends' && onOpenDM && (
          <MobileFavoriteFriendsView
            key="friends"
            onBack={() => setSubpage(null)}
            onOpenDM={onOpenDM}
          />
        )}
        {subpage === 'servers' && (
          <MobileServersListView
            key="servers"
            onBack={() => setSubpage(null)}
            onSelectServer={(id) => {
              setSubpage(null);
              onSelectServer?.(id);
            }}
          />
        )}
        {subpage === 'notifications' && (
          <MobileSettingsRedirectView
            key="notif-settings"
            variant="notifications"
            onBack={() => setSubpage(null)}
            onOpenFullSettings={() => {
              setSubpage(null);
              setShowSettings(true);
            }}
          />
        )}
        {subpage === 'appearance' && (
          <MobileSettingsRedirectView
            key="appearance-settings"
            variant="appearance"
            onBack={() => setSubpage(null)}
            onOpenFullSettings={() => {
              setSubpage(null);
              setShowSettings(true);
            }}
          />
        )}
        {subpage === 'privacy' && (
          <MobileSettingsRedirectView
            key="privacy-settings"
            variant="privacy"
            onBack={() => setSubpage(null)}
            onOpenFullSettings={() => {
              setSubpage(null);
              setShowSettings(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

