import { useEffect, useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, ChevronUp, X } from '@/components/icons/discord/lucide';
import { useUpdateProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { ProfileCardHeader } from './ProfileCardHeader';
import { StatusEmoji } from './StatusEmoji';
import {
  CLEAR_AFTER_OPTIONS,
  expiryFor,
  formatClearTime,
  joinCustomStatus,
  splitCustomStatus,
  type ClearAfter,
} from '@/lib/customStatus';
import { cn } from '@/lib/utils';

/*
 * "Définir ton statut" (video de reference) : un apercu du profil avec la bulle en
 * direct, le champ "Statut" precede d'un bouton emoji (gris au repos, emoji colore et
 * change au survol) qui ouvre le selecteur universel, puis "Effacer ..." (menu de duree
 * aligne sur l'option choisie) et "Enregistrer". Enregistrer un champ vide efface le statut.
 */

interface CustomStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HOVER_EMOJIS = ['😀', '😎', '🤣', '😝', '😍', '🥳', '🤔', '😜', '😴', '🤩'];
const ITEM_H = 40;
const HEADER_H = 40;
const TRIGGER_H = 40;

/** Duree choisie : une option ou "keep" (l'echeance deja enregistree sur le profil). */
type Choice = ClearAfter | 'keep';

export function CustomStatusModal({ open, onOpenChange }: CustomStatusModalProps) {
  const { profile } = useAuth();
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const [emoji, setEmoji] = useState('');
  const [text, setText] = useState('');
  const [choice, setChoice] = useState<Choice>('never');
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [hoverEmoji, setHoverEmoji] = useState(HOVER_EMOJIS[3]);
  const [emojiHover, setEmojiHover] = useState(false);

  const savedExpiry = profile?.custom_status_expires_at ?? null;

  useEffect(() => {
    if (!open) return;
    const parts = splitCustomStatus(profile?.custom_status);
    setEmoji(parts.emoji);
    setText(parts.text);
    setNow(new Date());
    setMenuOpen(false);
    if (!profile?.custom_status) setChoice('never');
    else setChoice(savedExpiry && new Date(savedExpiry).getTime() > Date.now() ? 'keep' : 'never');
    // Seule l'ouverture recharge le formulaire : une mise a jour du profil pendant la saisie ne l'ecrase pas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const expiryDate = useMemo(
    () => (choice === 'keep' ? (savedExpiry ? new Date(savedExpiry) : null) : expiryFor(choice, now)),
    [choice, savedExpiry, now],
  );
  const triggerLabel = choice === 'never' || !expiryDate ? 'Ne pas supprimer' : `Effacer ${formatClearTime(expiryDate, now)}`;
  const selectedIndex = Math.max(0, CLEAR_AFTER_OPTIONS.findIndex((o) => o.value === choice));

  const statusValue = joinCustomStatus({ emoji, text });
  const hasValue = !!(emoji || text);

  const save = () => {
    if (isPending) return;
    updateProfile({
      custom_status: statusValue,
      custom_status_expires_at: statusValue && expiryDate ? expiryDate.toISOString() : null,
    });
    // La fenetre se ferme tout de suite : le profil est deja mis a jour de facon optimiste.
    onOpenChange(false);
  };

  const cycleHoverEmoji = () => {
    setEmojiHover(true);
    setHoverEmoji((cur) => {
      let next = cur;
      while (next === cur) next = HOVER_EMOJIS[Math.floor(Math.random() * HOVER_EMOJIS.length)];
      return next;
    });
  };

  const bannerStyle: React.CSSProperties = profile?.banner_url
    ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : profile?.theme_gradient
      ? { background: `linear-gradient(135deg, ${profile.theme_gradient.split(',')[0]}, ${profile.theme_gradient.split(',')[1] ?? profile.theme_gradient.split(',')[0]})` }
      : { background: profile?.theme_color || 'hsl(var(--primary))' };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            // Le curseur arrive directement dans le champ de saisie.
            e.preventDefault();
            document.getElementById('custom-status-input')?.focus();
          }}
          className="fixed left-1/2 top-1/2 z-[100] w-[540px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#383840] border border-white/[0.08] p-3 shadow-[0_8px_16px_rgba(0,0,0,0.24)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.92] data-[state=closed]:duration-150 outline-none"
        >
          <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white pt-1 pl-1">Définir ton statut</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </DialogPrimitive.Close>

          {/* Apercu du profil (meme carte que partout) */}
          <div className="mt-5 flex justify-center">
            <div className="relative w-[362px] max-w-full rounded-lg bg-[#383840] shadow-[0_8px_16px_rgba(0,0,0,0.35)] pb-4" aria-hidden>
              <ProfileCardHeader
                size="sm"
                preview
                isOwn
                bubblePlaceholder="À quoi tu penses, en ce moment ?"
                user={{
                  id: profile?.id ?? '',
                  display_name: profile?.display_name ?? '',
                  username: profile?.username ?? '',
                  avatar_url: profile?.avatar_url ?? null,
                  banner_url: profile?.banner_url ?? null,
                  bio: null,
                  status: profile?.status || 'online',
                  pronouns: (profile as any)?.pronouns ?? null,
                  custom_status: statusValue,
                }}
                bannerStyle={bannerStyle}
              />
            </div>
          </div>

          {/* Champ de saisie */}
          <label htmlFor="custom-status-input" className="block mt-5 mb-2 text-sm font-semibold text-white">Statut</label>
          <div className="group/field relative flex items-center h-10 rounded-lg bg-[hsl(var(--background))]/60 border border-black/10 transition-colors focus-within:border-primary">
            <EmojiStickerPicker
              serverId={null}
              onEmojiSelect={(e) => setEmoji(e)}
              trigger={
                <button
                  type="button"
                  aria-label="Choisir un émoji"
                  onMouseEnter={cycleHoverEmoji}
                  onMouseLeave={() => setEmojiHover(false)}
                  className="ml-2 w-6 h-6 shrink-0 flex items-center justify-center rounded-md"
                >
                  {emoji ? (
                    <StatusEmoji emoji={emoji} className="w-6 h-6 text-[20px]" />
                  ) : (
                    <span
                      aria-hidden
                      className={cn('text-[20px] leading-none transition-[filter,opacity] duration-100', emojiHover ? 'grayscale-0 opacity-100' : 'grayscale opacity-70')}
                      style={{ fontFamily: '"Twemoji Mozilla","Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif' }}
                    >
                      {emojiHover ? hoverEmoji : '😀'}
                    </span>
                  )}
                </button>
              }
            />
            <input
              id="custom-status-input"
              value={text}
              maxLength={128}
              spellCheck={false}
              autoComplete="off"
              placeholder="À quoi tu penses, en ce moment ?"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              className="flex-1 min-w-0 h-full px-3 bg-transparent outline-none text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))]"
            />
            {hasValue && (
              <button
                type="button"
                aria-label="Effacer le statut"
                onClick={() => {
                  setEmoji('');
                  setText('');
                  document.getElementById('custom-status-input')?.focus();
                }}
                className="mr-2 w-5 h-5 shrink-0 rounded-full flex items-center justify-center bg-[hsl(var(--icon-default))]/70 text-[hsl(var(--input))] hover:bg-white transition-colors"
              >
                <X className="w-3 h-3" strokeWidth={3} />
              </button>
            )}
          </div>

          {/* Pied : duree + enregistrer */}
          <div className="mt-7 flex items-center justify-between">
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="h-10 pl-1 pr-2 flex items-center gap-2 rounded-md text-sm font-medium text-white hover:text-white/80 transition-colors"
                >
                  {triggerLabel}
                  {menuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={14}
                alignOffset={TRIGGER_H / 2 - ITEM_H / 2 - HEADER_H - selectedIndex * ITEM_H}
                className="z-[120] w-[236px] p-0 overflow-hidden rounded-lg bg-[hsl(var(--popover))] border border-white/[0.06]"
              >
                <div role="menu">
                  <div className="px-3 flex items-center text-sm text-[hsl(var(--text-muted,var(--muted-foreground)))]" style={{ height: HEADER_H }}>
                    Supprimer ultérieurement
                  </div>
                  {CLEAR_AFTER_OPTIONS.map((opt) => {
                    const at = expiryFor(opt.value, now);
                    const selected = choice === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => {
                          setChoice(opt.value);
                          setMenuOpen(false);
                        }}
                        className={cn(
                          'w-full px-3 flex items-center justify-between text-left text-sm text-white transition-colors',
                          selected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]',
                        )}
                        style={{ height: ITEM_H }}
                      >
                        <span className="truncate">
                          {opt.label}
                          {at && <span> ({formatClearTime(at, now)})</span>}
                        </span>
                        {selected && (
                          <span className="ml-2 w-[18px] h-[18px] shrink-0 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 active:bg-primary/80 text-sm font-medium text-white transition-colors disabled:opacity-60"
            >
              Enregistrer
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
