import { useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Hash, Search, Send, X } from '@/components/icons/discord/lucide';
import { Loader2 } from 'lucide-react';
import { useServers } from '@/hooks/useServers';
import { useDMConversations } from '@/hooks/useDMs';
import { useSendMessage } from '@/hooks/useMessages';
import { useSendDMMessage } from '@/hooks/useDMMessages';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/*
 * "Partager le profil" (video de reference) : recherche, liste des salons et des
 * conversations, pied de fenetre avec l'apercu du profil, message facultatif et
 * "Envoyer". Le profil est partage sous forme de mention <@id> cliquable.
 */

interface Target {
  key: string;
  kind: 'channel' | 'dm';
  id: string;
  title: string;
  subtitle: string;
  icon?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: { id: string; display_name: string; username: string; avatar_url: string | null };
}

export function ShareProfileModal({ open, onOpenChange, profile }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const { data: servers = [] } = useServers();
  const { data: conversations = [] } = useDMConversations();
  const sendChannel = useSendMessage();
  const sendDM = useSendDMMessage();

  const targets = useMemo<Target[]>(() => {
    const out: Target[] = [];
    for (const c of conversations) {
      const others = c.participants.filter((p) => p.id !== profile.id || c.participants.length === 1);
      out.push({
        key: `dm:${c.id}`,
        kind: 'dm',
        id: c.id,
        title: c.name || others.map((p) => p.display_name).join(', ') || 'Conversation',
        subtitle: c.is_group ? 'Groupe' : 'Message privé',
        icon: c.icon_url ?? others[0]?.avatar_url ?? null,
      });
    }
    for (const s of servers) {
      const chans = [...(s.orphanChannels ?? []), ...s.categories.flatMap((c) => c.channels)];
      for (const ch of chans) {
        if (ch.type && ch.type !== 'text' && ch.type !== 'announcement') continue;
        out.push({ key: `ch:${ch.id}`, kind: 'channel', id: ch.id, title: ch.name, subtitle: s.name, icon: s.icon_url });
      }
    }
    return out;
  }, [servers, conversations, profile.id]);

  const shown = targets.filter((t) => !query.trim() || `${t.title} ${t.subtitle}`.toLowerCase().includes(query.trim().toLowerCase()));

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const send = async () => {
    if (!selected.size || sending) return;
    setSending(true);
    const content = `${message.trim() ? `${message.trim()}\n` : ''}<@${profile.id}>`;
    try {
      await Promise.all(
        [...selected].map((key) => {
          const t = targets.find((x) => x.key === key);
          if (!t) return Promise.resolve();
          return t.kind === 'dm'
            ? sendDM.mutateAsync({ conversationId: t.id, content })
            : sendChannel.mutateAsync({ channelId: t.id, content });
        }),
      );
      toast.success(selected.size > 1 ? 'Profil partagé !' : 'Profil partagé !');
      onOpenChange(false);
      setSelected(new Set());
      setMessage('');
    } catch {
      toast.error('Impossible de partager le profil');
    } finally {
      setSending(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[calc(100vw-32px)] h-[min(660px,90vh)] flex flex-col rounded-xl bg-[hsl(var(--input))] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-100"
        >
          <div className="px-4 pt-4">
            <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white pl-1 pt-1">Partager le profil</DialogPrimitive.Title>
            <p className="mt-2 pl-1 text-sm text-muted-foreground">Choisis où tu veux partager ce profil.</p>
            <DialogPrimitive.Close aria-label="Fermer" className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
            <label className="mt-4 flex items-center h-10 rounded-lg bg-[hsl(var(--background))]/60 border border-black/10 px-3 gap-2 focus-within:border-primary">
              <Search className="w-5 h-5 text-[hsl(var(--icon-default))]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher"
                aria-label="Rechercher un salon ou une conversation"
                className="flex-1 min-w-0 bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground"
              />
            </label>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-2 mt-2">
            {shown.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucun résultat.</p>}
            {shown.map((t) => {
              const on = selected.has(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggle(t.key)}
                  className="w-full h-[52px] px-2 rounded-lg flex items-center gap-3 text-left hover:bg-white/[0.05] transition-colors"
                >
                  <span className="relative w-8 h-8 shrink-0">
                    {t.icon ? (
                      <img src={t.icon} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-primary/25 text-sm flex items-center justify-center text-white">{t.title.charAt(0).toUpperCase()}</span>
                    )}
                    {t.kind === 'channel' && (
                      <span className="absolute -bottom-1 -right-1 w-[18px] h-[18px] rounded-full bg-[hsl(var(--input))] flex items-center justify-center text-[hsl(var(--icon-default))]">
                        <Hash className="w-3 h-3" />
                      </span>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span translate="no" className="block text-base leading-5 font-semibold text-white truncate">{t.title}</span>
                    <span translate="no" className="block text-xs leading-4 text-muted-foreground truncate">{t.subtitle}</span>
                  </span>
                  <span className={cn('w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors', on ? 'bg-primary border-primary' : 'border-[hsl(var(--icon-default))]/60')}>
                    {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="shrink-0 p-4 space-y-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-3">
              <UserAvatarImage src={profile.avatar_url} alt="" className="w-9 h-9" fallbackClassName="bg-primary/20 text-primary text-sm" fallback={profile.display_name.charAt(0).toUpperCase()} ownerId={profile.id} />
              <span className="min-w-0">
                <span translate="no" className="block text-sm font-semibold text-white truncate">{profile.display_name}</span>
                <span translate="no" className="block text-xs text-muted-foreground truncate">{profile.username}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                placeholder="Ajouter un message facultatif…"
                aria-label="Message facultatif"
                className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-[hsl(var(--background))]/60 border border-black/10 focus:border-primary outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!selected.size || sending}
                className="h-10 px-4 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium text-white flex items-center gap-2 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Envoyer <Send className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
