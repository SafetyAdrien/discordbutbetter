import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Settings,
  Moon,
  Pencil,
  Circle,
  MinusCircle,
  EyeOff,
  LogOut,
  ChevronRight,
  Sparkles,
  Bell,
  Shield,
  Palette,
  HelpCircle,
  Copy,
  Check,
  QrCode,
} from 'lucide-react';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { CustomStatusModal } from '@/components/profile/CustomStatusModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { uuidToSnowflake } from '@/lib/snowflake';
import { useFriends } from '@/hooks/useFriends';
import { useServers } from '@/hooks/useServers';

const STATUS_OPTIONS = [
  { value: 'online', label: 'En ligne', icon: Circle, color: 'text-[hsl(var(--online))]', fill: 'fill-[hsl(var(--online))]' },
  { value: 'idle', label: 'Inactif', icon: Circle, color: 'text-[hsl(var(--idle))]', fill: 'fill-[hsl(var(--idle))]' },
  { value: 'dnd', label: 'Ne pas déranger', icon: MinusCircle, color: 'text-[hsl(var(--dnd))]', fill: '' },
  { value: 'offline', label: 'Invisible', icon: EyeOff, color: 'text-[hsl(var(--offline))]', fill: '' },
] as const;

export function MobileProfileView() {
  const { profile, user, signOut } = useAuth();
  const { data: friends = [] } = useFriends();
  const { data: servers = [] } = useServers();
  const [showSettings, setShowSettings] = useState(false);
  const [_settingsTab, setSettingsTab] = useState<'account' | 'profile'>('account');
  const [showStatus, setShowStatus] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const acceptedFriends = friends.filter((f: any) => f.status === 'accepted').length;
  const serverCount = servers.length;

  const statusColors: Record<string, string> = {
    online: 'bg-[hsl(var(--online))]',
    idle: 'bg-[hsl(var(--idle))]',
    dnd: 'bg-[hsl(var(--dnd))]',
    offline: 'bg-[hsl(var(--offline))]',
  };

  const handleStatusChange = async (status: 'online' | 'idle' | 'dnd' | 'offline') => {
    if (!user?.id) return;
    haptics.light();
    await supabase.from('profiles').update({ status }).eq('id', user.id);
    setStatusOpen(false);
  };

  const handleOpenSettings = (tab: 'account' | 'profile') => {
    haptics.light();
    setSettingsTab(tab);
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

  const handleSignOut = async () => {
    haptics.medium();
    await signOut();
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === (profile?.status || 'offline'));
  const initial = profile?.display_name?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="h-12 px-4 flex items-center justify-between border-b border-border shrink-0">
        <h1 className="font-semibold text-base">Toi</h1>
        <button
          onClick={() => handleOpenSettings('account')}
          className="w-9 h-9 rounded-full flex items-center justify-center -mr-2 active:bg-muted/60 transition-colors"
          aria-label="Paramètres"
        >
          <Settings className="w-5 h-5 text-muted-foreground" />
        </button>
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
                  : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow, var(--primary))))',
              }}
            />
          )}

          {/* Avatar overlap */}
          <div className="px-4 -mt-12 relative">
            <div className="flex items-end justify-between">
              <div className="relative">
                <Avatar className="w-24 h-24 ring-[5px] ring-background">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'absolute bottom-1 right-1 w-6 h-6 rounded-full border-[4px] border-background',
                    statusColors[profile?.status || 'offline'],
                  )}
                  aria-label={`Statut : ${currentStatus?.label}`}
                />
              </div>

              <button
                onClick={() => handleOpenSettings('profile')}
                className="mb-2 px-4 h-9 rounded-full bg-muted/60 text-sm font-medium active:bg-muted transition-colors flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
            </div>
          </div>
        </section>

        {/* Identity card */}
        <section className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-xl truncate">{profile?.display_name || 'Utilisateur'}</h2>
              <p className="text-sm text-muted-foreground truncate">@{profile?.username}</p>
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
            <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
              <div className="font-semibold text-base leading-none">{acceptedFriends}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {acceptedFriends > 1 ? 'Amis' : 'Ami'}
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-center">
              <div className="font-semibold text-base leading-none">{serverCount}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {serverCount > 1 ? 'Serveurs' : 'Serveur'}
              </div>
            </div>
          </div>
        </section>

        {/* Status switcher — full row */}
        <section className="mx-4 mt-3 rounded-2xl bg-card border border-border/50 overflow-hidden">
          <Popover open={statusOpen} onOpenChange={setStatusOpen}>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center',
                    'bg-muted/40',
                  )}
                >
                  <div className={cn('w-3 h-3 rounded-full', statusColors[profile?.status || 'offline'])} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{currentStatus?.label || 'Hors ligne'}</div>
                  <div className="text-xs text-muted-foreground">Toucher pour changer</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="end" side="bottom">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors active:bg-muted',
                      profile?.status === opt.value && 'bg-muted/60',
                    )}
                  >
                    <Icon className={cn('w-4 h-4', opt.color, opt.fill)} />
                    {opt.label}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          <div className="h-px bg-border/40 mx-4" />

          <button
            onClick={() => {
              haptics.light();
              setShowStatus(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40">
              <Moon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 text-left text-sm font-medium">Statut personnalisé</div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </section>

        {/* Account section */}
        <SectionHeader>Compte</SectionHeader>
        <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
          <RowItem
            icon={<Pencil className="w-4 h-4 text-muted-foreground" />}
            label="Modifier le profil"
            onClick={() => handleOpenSettings('profile')}
          />
          <Divider />
          <RowItem
            icon={<QrCode className="w-4 h-4 text-muted-foreground" />}
            label="Mon code QR"
            onClick={() => toast.info('Bientôt disponible')}
          />
          <Divider />
          <RowItem
            icon={<Sparkles className="w-4 h-4 text-muted-foreground" />}
            label="Boost & avantages"
            onClick={() => handleOpenSettings('account')}
          />
        </section>

        {/* Preferences section */}
        <SectionHeader>Préférences</SectionHeader>
        <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
          <RowItem
            icon={<Bell className="w-4 h-4 text-muted-foreground" />}
            label="Notifications"
            onClick={() => handleOpenSettings('account')}
          />
          <Divider />
          <RowItem
            icon={<Palette className="w-4 h-4 text-muted-foreground" />}
            label="Apparence"
            onClick={() => handleOpenSettings('account')}
          />
          <Divider />
          <RowItem
            icon={<Shield className="w-4 h-4 text-muted-foreground" />}
            label="Confidentialité & sécurité"
            onClick={() => handleOpenSettings('account')}
          />
        </section>

        {/* Support section */}
        <SectionHeader>Support</SectionHeader>
        <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
          <RowItem
            icon={<HelpCircle className="w-4 h-4 text-muted-foreground" />}
            label="Aide & FAQ"
            onClick={() => toast.info('Bientôt disponible')}
          />
          <Divider />
          <RowItem
            icon={<Settings className="w-4 h-4 text-muted-foreground" />}
            label="Paramètres avancés"
            onClick={() => handleOpenSettings('account')}
          />
        </section>

        {/* Logout */}
        <section className="mx-4 mt-6 rounded-2xl bg-card border border-border/50 overflow-hidden">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium text-destructive active:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </section>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-4 px-4">
          ID · {user?.id ? uuidToSnowflake(user.id) : '—'}
        </p>
      </div>

      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} initialTab={null} />}
      {showStatus && <CustomStatusModal open={showStatus} onOpenChange={setShowStatus} />}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-6 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function Divider() {
  return <div className="h-px bg-border/40 mx-4" />;
}

function RowItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors"
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40">{icon}</div>
      <div className="flex-1 text-left text-sm font-medium">{label}</div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
