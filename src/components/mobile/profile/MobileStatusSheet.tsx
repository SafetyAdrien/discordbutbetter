import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfile';
import { useServers } from '@/hooks/useServers';
import { useServerEmojis } from '@/hooks/useServerAssets';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Circle, MinusCircle, EyeOff, Smile, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS = [
  { value: 'online', label: 'En ligne', icon: Circle, color: 'text-[hsl(var(--online))]', dot: 'bg-[hsl(var(--online))]' },
  { value: 'idle', label: 'Inactif', icon: Circle, color: 'text-[hsl(var(--idle))]', dot: 'bg-[hsl(var(--idle))]' },
  { value: 'dnd', label: 'Ne pas déranger', icon: MinusCircle, color: 'text-[hsl(var(--dnd))]', dot: 'bg-[hsl(var(--dnd))]' },
  { value: 'offline', label: 'Invisible', icon: EyeOff, color: 'text-[hsl(var(--offline))]', dot: 'bg-[hsl(var(--offline))]' },
] as const;

const DURATION_OPTIONS = [
  { value: 'never', label: 'Aujourd\'hui' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 heure' },
  { value: '4h', label: '4 heures' },
  { value: 'permanent', label: 'Ne pas effacer' },
] as const;

const BASIC_EMOJIS = ['😀', '😎', '🎮', '🎧', '📺', '🏆', '💤', '🔥', '💻', '📚', '🎬', '🎵', '⚡', '🌙', '☕', '🍕', '✨', '❤️', '👋', '🚀', '🌴', '🍿', '🎯', '💡'];

export function MobileStatusSheet({ open, onOpenChange }: Props) {
  const { profile, user } = useAuth();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { data: servers = [] } = useServers();

  // Aggregate server emojis from all servers the user is a member of
  // (each server's emojis loaded lazily via separate hooks would be expensive,
  // so we lift the first 5 servers as a reasonable cap)
  const sampleServerIds = servers.slice(0, 5).map((s: any) => s.id);

  const [statusEmoji, setStatusEmoji] = useState('');
  const [statusText, setStatusText] = useState('');
  const [duration, setDuration] = useState<string>('never');
  const [emojiTab, setEmojiTab] = useState<'basic' | 'servers'>('basic');
  const [emojiOpen, setEmojiOpen] = useState(false);

  useEffect(() => {
    if (open && profile) {
      const existing = profile.custom_status || '';
      const emojiMatch = existing.match(/^(\p{Emoji}\uFE0F?)\s*/u);
      if (emojiMatch) {
        setStatusEmoji(emojiMatch[1]);
        setStatusText(existing.slice(emojiMatch[0].length));
      } else {
        setStatusEmoji('');
        setStatusText(existing);
      }
    }
  }, [open, profile]);

  const handleSetStatus = (status: 'online' | 'idle' | 'dnd' | 'offline') => {
    if (!user) return;
    haptics.light();
    updateProfile(
      { status } as any,
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const handleSaveCustomStatus = () => {
    haptics.medium();
    const customStatus = statusEmoji && statusText
      ? `${statusEmoji} ${statusText}`
      : statusEmoji || statusText || null;
    updateProfile(
      { custom_status: customStatus },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const handleClearCustomStatus = () => {
    haptics.light();
    setStatusEmoji('');
    setStatusText('');
    updateProfile({ custom_status: null });
  };

  const initial = (profile?.display_name || '?').charAt(0).toUpperCase();
  const hasCustomStatus = statusEmoji || statusText;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88vh] p-0 rounded-t-3xl border-t border-border bg-background"
      >
        <div className="flex flex-col h-full">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-base">Définir mon statut</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center active:bg-muted/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pb-6" style={{ overscrollBehavior: 'contain' }}>
            {/* User card */}
            <div className="mx-4 rounded-2xl bg-card border border-border/50 p-4 flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{profile?.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{profile?.username}</p>
              </div>
            </div>

            {/* Custom status section */}
            <SectionHeader>Statut personnalisé</SectionHeader>
            <div className="mx-4 rounded-2xl bg-card border border-border/50 p-3 space-y-3">
              <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-1 py-1">
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="w-9 h-9 rounded-lg flex items-center justify-center active:bg-muted shrink-0"
                      aria-label="Choisir un émoji"
                    >
                      {statusEmoji ? (
                        <span className="text-lg">{statusEmoji}</span>
                      ) : (
                        <Smile className="w-5 h-5 text-muted-foreground" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[320px] p-0 max-w-[calc(100vw-32px)]"
                    align="start"
                    side="top"
                  >
                    <EmojiPicker
                      tab={emojiTab}
                      onTabChange={setEmojiTab}
                      sampleServerIds={sampleServerIds}
                      onSelect={(emoji) => {
                        setStatusEmoji(emoji);
                        setEmojiOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="Quel est ton statut ?"
                  maxLength={128}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-2"
                />
                {hasCustomStatus && (
                  <button
                    onClick={() => {
                      setStatusEmoji('');
                      setStatusText('');
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center active:bg-muted shrink-0"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Duration */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/40 active:bg-muted/60 text-sm">
                    <span className="text-muted-foreground">Effacer après</span>
                    <span className="flex items-center gap-1 font-medium">
                      {DURATION_OPTIONS.find((o) => o.value === duration)?.label}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="end">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDuration(opt.value)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between active:bg-muted/60',
                        duration === opt.value && 'bg-muted/40'
                      )}
                    >
                      {opt.label}
                      {duration === opt.value && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2 pt-1">
                {profile?.custom_status && (
                  <Button
                    variant="ghost"
                    onClick={handleClearCustomStatus}
                    disabled={isPending}
                    className="flex-1 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Effacer
                  </Button>
                )}
                <Button
                  onClick={handleSaveCustomStatus}
                  disabled={isPending || !hasCustomStatus}
                  className="flex-1 h-10 rounded-xl"
                >
                  Définir
                </Button>
              </div>
            </div>

            {/* Status options */}
            <SectionHeader>Statut en ligne</SectionHeader>
            <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
              {STATUS_OPTIONS.map((opt, idx) => {
                const isCurrent = profile?.status === opt.value;
                return (
                  <div key={opt.value}>
                    {idx > 0 && <div className="h-px bg-border/40 mx-4" />}
                    <button
                      onClick={() => handleSetStatus(opt.value)}
                      disabled={isPending}
                      className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40">
                        <div className={cn('w-3 h-3 rounded-full', opt.dot)} />
                      </div>
                      <span className="flex-1 text-left text-sm font-medium">{opt.label}</span>
                      {isCurrent && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  </div>
                );
              })}
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-6 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function EmojiPicker({
  tab,
  onTabChange,
  sampleServerIds,
  onSelect,
}: {
  tab: 'basic' | 'servers';
  onTabChange: (t: 'basic' | 'servers') => void;
  sampleServerIds: string[];
  onSelect: (emoji: string) => void;
}) {
  return (
    <div className="flex flex-col">
      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-border/50">
        <button
          onClick={() => onTabChange('basic')}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            tab === 'basic' ? 'bg-muted text-foreground' : 'text-muted-foreground active:bg-muted/40'
          )}
        >
          Basiques
        </button>
        <button
          onClick={() => onTabChange('servers')}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
            tab === 'servers' ? 'bg-muted text-foreground' : 'text-muted-foreground active:bg-muted/40'
          )}
        >
          Serveurs
        </button>
      </div>

      {/* Content */}
      <div className="p-2 max-h-[260px] overflow-y-auto">
        {tab === 'basic' ? (
          <div className="grid grid-cols-8 gap-1">
            {BASIC_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => onSelect(e)}
                className="text-xl p-1.5 rounded-lg hover:bg-muted active:bg-muted/60 transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        ) : (
          <ServerEmojiGrids serverIds={sampleServerIds} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}

function ServerEmojiGrids({
  serverIds,
  onSelect,
}: {
  serverIds: string[];
  onSelect: (emoji: string) => void;
}) {
  if (serverIds.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-6">
        Rejoins un serveur pour utiliser ses émojis
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {serverIds.map((id) => (
        <ServerEmojiSection key={id} serverId={id} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ServerEmojiSection({ serverId, onSelect }: { serverId: string; onSelect: (emoji: string) => void }) {
  const { data: emojis = [] } = useServerEmojis(serverId);
  const { data: servers = [] } = useServers();
  const server = servers.find((s: any) => s.id === serverId);
  if (emojis.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
        {server?.name || 'Serveur'}
      </p>
      <div className="grid grid-cols-8 gap-1">
        {emojis.slice(0, 24).map((emoji) => (
          <button
            key={emoji.id}
            onClick={() => onSelect(`:${emoji.name}:`)}
            className="aspect-square p-1 rounded-lg hover:bg-muted active:bg-muted/60 transition-colors"
            title={`:${emoji.name}:`}
          >
            <img src={emoji.url} alt={emoji.name} className="w-full h-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  );
}
