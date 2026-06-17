import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Settings,
  Pencil,
  // ChevronRight removed (no longer used)
  Copy,
  Check,
  X,
  Link2,
  Plus,
  BadgeCheck,
} from 'lucide-react';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { MobileStatusSheet } from './profile/MobileStatusSheet';
import { MobileEditProfileView } from './profile/MobileEditProfileView';
import { MobileQRCodeView } from './profile/MobileQRCodeView';
import { MobileFavoriteFriendsView } from './profile/MobileFavoriteFriendsView';
import { MobileServersListView } from './profile/MobileServersListView';
import { MobileSettingsRedirectView } from './profile/MobileSettingsRedirectView';
import { MobileFullProfileView } from './profile/MobileFullProfileView';
import { CustomStatusModal } from '@/components/profile/CustomStatusModal';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { uuidToSnowflake } from '@/lib/snowflake';
import { MarkdownText } from '@/lib/markdown';
import { useFriends } from '@/hooks/useFriends';
import { useServers } from '@/hooks/useServers';
import {
  CONNECTION_PROVIDERS_BY_ID,
  formatConnectionDisplay,
  formatStatCount,
  accountAgeYears,
  STAT_ENABLED_PROVIDERS,
  type ProfileConnection,
} from '@/lib/connections';

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
  const [showCustomStatus, setShowCustomStatus] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [subpage, setSubpage] = useState<Subpage>(null);

  const acceptedFriends = friends.filter((f: any) => f.status === 'accepted').length;
  const serverCount = servers.length;
  const connections: ProfileConnection[] = Array.isArray((profile as any)?.connections)
    ? ((profile as any).connections as ProfileConnection[])
    : [];

  const statusColors: Record<string, string> = {
    online: 'bg-[hsl(var(--online))]',
    idle: 'bg-[hsl(var(--idle))]',
    dnd: 'bg-[hsl(var(--dnd))]',
    offline: 'bg-[hsl(var(--offline))]',
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
    haptics.light();
  };

  const handleCopyDisplayName = async () => {
    if (!profile?.display_name) return;
    haptics.light();
    await navigator.clipboard.writeText(profile.display_name);
    setCopied(true);
    toast.success("Nom d'affichage copié");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyUsername = async () => {
    if (!profile?.username) return;
    haptics.light();
    await navigator.clipboard.writeText(profile.username);
    setCopiedUsername(true);
    toast.success("Nom d'utilisateur copié");
    setTimeout(() => setCopiedUsername(false), 1500);
  };

  // Kept for parity (id snowflake) — currently unused after copy reassignment
  void uuidToSnowflake;
  void user;

  const initial = profile?.display_name?.charAt(0)?.toUpperCase() || '?';
  const currentStatus = profile?.status || 'offline';

  const handleClose = () => {
    haptics.light();
    if (window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
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
            onClick={handleClose}
            className="absolute top-3 left-3 flex h-8 w-8 min-w-[2rem] max-w-[2rem] min-h-[2rem] max-h-[2rem] aspect-square shrink-0 items-center justify-center rounded-full bg-background/75 p-0 leading-none backdrop-blur-md active:bg-background/90 transition-colors overflow-hidden"
            aria-label="Fermer"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>

          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              onClick={() => {
                haptics.light();
                setSubpage('edit-profile');
              }}
              className="flex h-8 w-8 min-w-[2rem] max-w-[2rem] min-h-[2rem] max-h-[2rem] aspect-square shrink-0 items-center justify-center rounded-full bg-background/75 p-0 leading-none backdrop-blur-md active:bg-background/90 transition-colors overflow-hidden"
              aria-label="Modifier le profil"
            >
              <Pencil className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={handleOpenSettings}
              className="flex h-8 w-8 min-w-[2rem] max-w-[2rem] min-h-[2rem] max-h-[2rem] aspect-square shrink-0 items-center justify-center rounded-full bg-background/75 p-0 leading-none backdrop-blur-md active:bg-background/90 transition-colors overflow-hidden"
              aria-label="Paramètres"
            >
              <Settings className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Avatar + Custom status bubble (Desktop-style compact) */}
          <div className="px-4 -mt-12 relative z-10">
            <div className="flex items-end gap-4">
              <button
                onClick={() => {
                  haptics.light();
                  setShowStatusSheet(true);
                }}
                className="relative active:opacity-80 transition-opacity shrink-0"
                aria-label="Changer le statut en ligne"
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
            </div>
          </div>

          {/* Custom status zone — pinned to the banner edge */}
          <button
            type="button"
            onClick={() => {
              haptics.light();
              setShowCustomStatus(true);
            }}
            aria-label="Modifier le statut personnalisé"
            className={cn(
              'absolute left-32 z-20 inline-flex text-left pl-2 pr-4 py-2 mr-3 rounded-full bg-[hsl(220_8%_18%)] active:bg-[hsl(220_8%_22%)] transition-colors',
              'flex items-center gap-2 min-h-[40px] shadow-md',
              profile?.banner_url ? 'top-[122px]' : 'top-[90px]'
            )}
          >
            {/* Mini bulle détachée */}
            <span
              aria-hidden
              className="absolute -left-3 -top-5 w-4 h-4 rounded-full bg-[hsl(220_8%_18%)] shadow-lg"
            />
            {/* Petite bulle fondue dans le haut-gauche de la bulle large */}
            <span
              aria-hidden
              className="absolute left-2 -top-2 w-4 h-4 rounded-[4px_50%_50%_50%] bg-[hsl(220_8%_18%)]"
            />
            <span className="shrink-0 w-5 h-5 text-foreground flex items-center justify-center">
              <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
            </span>
            {profile?.custom_status ? (
              <span className="text-base text-foreground italic whitespace-nowrap">{profile.custom_status}</span>
            ) : (
              <span className="text-base text-muted-foreground italic whitespace-nowrap">Quoi de neuf ?</span>
            )}
          </button>
        </section>

        <section className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-xl truncate">
                {profile?.display_name || 'Utilisateur'}
              </h2>
              <p className="text-sm text-muted-foreground truncate">@{profile?.username}</p>
              {profile?.pronouns && (
                <p className="text-xs text-muted-foreground mt-0.5">{profile.pronouns}</p>
              )}
            </div>
            <div className="flex flex-col items-center shrink-0">
              <button
                onClick={handleCopyDisplayName}
                className="w-7 h-7 rounded-full active:bg-muted/60 transition-colors flex items-center justify-center"
                aria-label="Copier le nom d'affichage"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[hsl(var(--online))]/80" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground/60" />
                )}
              </button>
              <button
                onClick={handleCopyUsername}
                className="w-5 h-5 rounded-full active:bg-muted/60 transition-colors flex items-center justify-center"
                aria-label="Copier le nom d'utilisateur"
              >
                {copiedUsername ? (
                  <Check className="w-3 h-3 text-[hsl(var(--online))]/80" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground/60" />
                )}
              </button>
            </div>
          </div>

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

        {/* About */}
        {profile?.bio && (
          <section className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 py-3 px-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              À propos de moi
            </h3>
            <div className="text-sm text-foreground/80 leading-relaxed break-words">
              <MarkdownText content={profile.bio} variant="bio" className="w-full" />
            </div>
          </section>
        )}

        {/* Connections */}
        <section className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Connections</h3>
          </div>
          {connections.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Aucune connexion pour le moment
            </div>
          ) : (
            <div className="space-y-2">
              {connections.map((c, i) => {
                const provider = CONNECTION_PROVIDERS_BY_ID[c.provider];
                if (!provider) return null;
                const Icon = provider.icon;
                const hasStats = STAT_ENABLED_PROVIDERS.has(c.provider) && c.stats;
                const age = accountAgeYears(c.stats?.account_created_at);
                const statBits: string[] = [];
                if (c.stats?.followers_count != null) statBits.push(`${formatStatCount(c.stats.followers_count)} abonnés`);
                if (c.stats?.posts_count != null) statBits.push(`${formatStatCount(c.stats.posts_count)} posts`);
                if (age != null) statBits.push(age === 0 ? 'Compte récent' : `Compte depuis ${age} an${age > 1 ? 's' : ''}`);
                return (
                  <div key={`${c.provider}-${i}`} className="flex items-start gap-3 px-1 py-1">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40 shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{formatConnectionDisplay(c)}</span>
                        {c.stats?.is_verified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{provider.label}</div>
                      {hasStats && statBits.length > 0 && (
                        <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                          {statBits.join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="h-6" />
      </div>

      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} initialTab={null} />}

      <MobileStatusSheet open={showStatusSheet} onOpenChange={setShowStatusSheet} />
      <CustomStatusModal open={showCustomStatus} onOpenChange={setShowCustomStatus} />

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

