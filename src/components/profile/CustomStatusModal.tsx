import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Circle, MinusCircle, EyeOff, Smile, X, Check, ChevronDown, Gamepad2, Headphones, Eye, Trophy } from 'lucide-react';
import { useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CustomStatusModalProps {
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

const ACTIVITY_TYPES = [
  { value: 'playing', label: 'Joue à', icon: Gamepad2, color: 'text-violet-400' },
  { value: 'listening', label: 'Écoute', icon: Headphones, color: 'text-green-400' },
  { value: 'watching', label: 'Regarde', icon: Eye, color: 'text-red-400' },
  { value: 'competing', label: 'En compétition', icon: Trophy, color: 'text-yellow-400' },
];

const COMMON_EMOJIS = ['😀', '😎', '🎮', '🎧', '📺', '🏆', '💤', '🔥', '💻', '📚', '🎬', '🎵', '⚡', '🌙', '☕', '🍕', '✨', '❤️', '👋', '🚀', '🌴', '🍿', '🎯', '💡'];

export function CustomStatusModal({ open, onOpenChange }: CustomStatusModalProps) {
  const { profile, user } = useAuth();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const queryClient = useQueryClient();

  const [statusEmoji, setStatusEmoji] = useState('');
  const [statusText, setStatusText] = useState('');
  const [activityType, setActivityType] = useState<string>('');
  const [activityText, setActivityText] = useState('');
  const [duration, setDuration] = useState<string>('never');
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Load current status on open
  useEffect(() => {
    if (open && profile) {
      const existingStatus = profile.custom_status || '';
      const emojiMatch = existingStatus.match(/^(\p{Emoji}\uFE0F?)\s*/u);
      if (emojiMatch) {
        setStatusEmoji(emojiMatch[1]);
        setStatusText(existingStatus.slice(emojiMatch[0].length));
      } else {
        setStatusEmoji('');
        setStatusText(existingStatus);
      }
      setActivityType(profile.activity_type || '');
      setActivityText(profile.activity_text || '');
    }
  }, [open, profile]);

  const handleSetStatus = (status: 'online' | 'idle' | 'dnd' | 'offline') => {
    if (!user) return;
    updateProfile(
      { status } as any,
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          queryClient.invalidateQueries({ queryKey: ['members'] });
        },
      }
    );
  };

  const handleSave = () => {
    const customStatus = statusEmoji && statusText
      ? `${statusEmoji} ${statusText}`
      : statusEmoji || statusText || null;

    updateProfile({
      custom_status: customStatus,
      activity_type: activityType || null,
      activity_text: activityText || null,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['members'] });
        onOpenChange(false);
      },
    });
  };

  const handleClear = () => {
    setStatusEmoji('');
    setStatusText('');
    setActivityType('');
    setActivityText('');

    updateProfile({
      custom_status: null,
      activity_type: null,
      activity_text: null,
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['members'] });
        onOpenChange(false);
      },
    });
  };

  const hasStatus = statusEmoji || statusText;
  const selectedActivity = ACTIVITY_TYPES.find(a => a.value === activityType);
  const initial = (profile?.display_name || '?').charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background p-0 overflow-hidden border-none">
        <DialogHeader className="px-4 pb-3 pt-4">
          <DialogTitle className="text-base font-semibold">Définir mon statut</DialogTitle>
        </DialogHeader>

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
            {/* Status input row */}
            <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-1 py-1">
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted/60 shrink-0"
                    aria-label="Choisir un émoji"
                  >
                    {statusEmoji ? (
                      <span className="text-lg">{statusEmoji}</span>
                    ) : (
                      <Smile className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-2" align="start">
                  <div className="grid grid-cols-8 gap-1">
                    {COMMON_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setStatusEmoji(emoji);
                          setEmojiOpen(false);
                        }}
                        className="text-xl p-1 hover:bg-muted rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Input
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="Quel est ton statut ?"
                maxLength={128}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-2"
              />

              {hasStatus && (
                <button
                  onClick={() => {
                    setStatusEmoji('');
                    setStatusText('');
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted/60 shrink-0"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Activity Type */}
            <Select
              value={activityType || "none"}
              onValueChange={(value) => setActivityType(value === "none" ? "" : value)}
            >
              <SelectTrigger className="bg-muted/40 border-0 rounded-xl h-10 focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Type d'activité">
                  {selectedActivity ? (
                    <div className="flex items-center gap-2">
                      <selectedActivity.icon className={cn("w-4 h-4", selectedActivity.color)} />
                      <span>{selectedActivity.label}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Type d'activité</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Aucune activité</span>
                </SelectItem>
                {ACTIVITY_TYPES.map((activity) => (
                  <SelectItem key={activity.value} value={activity.value}>
                    <div className="flex items-center gap-2">
                      <activity.icon className={cn("w-4 h-4", activity.color)} />
                      <span>{activity.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activityType && (
              <Input
                value={activityText}
                onChange={(e) => setActivityText(e.target.value)}
                placeholder={
                  activityType === 'playing' ? 'Nom du jeu...' :
                  activityType === 'listening' ? 'Nom de la musique/artiste...' :
                  activityType === 'watching' ? 'Nom du film/série...' :
                  activityType === 'competing' ? 'Nom de la compétition...' :
                  'Détails...'
                }
                className="bg-muted/40 rounded-xl border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                maxLength={128}
              />
            )}

            {/* Duration */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 text-sm transition-colors">
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
                      'w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between hover:bg-muted/60',
                      duration === opt.value && 'bg-muted/40'
                    )}
                  >
                    {opt.label}
                    {duration === opt.value && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {profile?.custom_status && (
                <Button
                  variant="ghost"
                  onClick={handleClear}
                  disabled={isPending}
                  className="flex-1 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Effacer
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isPending || !hasStatus}
                className="flex-1 h-10 rounded-xl"
              >
                {isPending ? 'Enregistrement...' : 'Définir'}
              </Button>
            </div>
          </div>

          {/* Online status section */}
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
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors disabled:opacity-50"
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
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-6 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}
