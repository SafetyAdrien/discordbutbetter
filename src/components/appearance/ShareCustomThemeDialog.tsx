/**
 * ShareCustomThemeDialog
 *
 * Wraps the current theme into a compact marker
 * ([[nexuschat-theme:v1:BASE64URL]]) plus an optional friendly name and
 * message, then inserts it as a new message into the channels the user
 * selects. The marker is picked up on the receiving side by
 * `ThemeCardEmbed` which renders a card with an "Appliquer" button.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Send } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServers } from '@/hooks/useServers';
import { toast } from 'sonner';
import { encodeCustomTheme } from '@/lib/customTheme/encode';

interface ShareCustomThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: { chips: string[]; angle: number; intensity: number };
}

interface TextChannel {
  id: string;
  name: string;
  server_id: string;
  server_name: string;
}

export function ShareCustomThemeDialog({ open, onOpenChange, theme }: ShareCustomThemeDialogProps) {
  const { user } = useAuth();
  const { data: servers } = useServers();

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [channels, setChannels] = useState<TextChannel[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Load text channels from every server the user belongs to.
  useEffect(() => {
    if (!open || !servers || servers.length === 0) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const ids = servers.map((s) => s.id);
      const { data, error } = await supabase
        .from('channels')
        .select('id, name, server_id, type')
        .in('server_id', ids)
        .eq('type', 'text')
        .order('name');
      if (cancelled) return;
      if (error) {
        toast.error('Impossible de charger les salons');
        setLoading(false);
        return;
      }
      const nameById = new Map(servers.map((s) => [s.id, s.name]));
      setChannels(
        (data ?? []).map((c: { id: string; name: string; server_id: string }) => ({
          id: c.id,
          name: c.name,
          server_id: c.server_id,
          server_name: nameById.get(c.server_id) ?? '',
        })),
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, servers]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(q) || c.server_name.toLowerCase().includes(q));
  }, [channels, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, TextChannel[]>();
    for (const c of filtered) {
      const arr = map.get(c.server_name) ?? [];
      arr.push(c);
      map.set(c.server_name, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!user || selected.size === 0) return;
    setSending(true);
    const marker = encodeCustomTheme({ ...theme, name: name.trim() || undefined });
    const body = note.trim() ? `${note.trim()}\n\n${marker}` : marker;
    const rows = Array.from(selected).map((cid) => ({
      channel_id: cid,
      content: body,
      author_id: user.id,
      attachments: [] as unknown as never,
    }));
    const { error } = await supabase.from('messages').insert(rows);
    setSending(false);
    if (error) {
      toast.error("Échec de l'envoi", { description: error.message });
      return;
    }
    setSelected(new Set());
    setNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Partager ce thème</DialogTitle>
          <DialogDescription>
            Choisissez les salons où envoyer votre création. Les destinataires pourront l'appliquer d'un clic.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 space-y-3">
          {/* Preview strip */}
          <div
            className="h-16 rounded-xl border border-border/60"
            style={{
              background: `linear-gradient(${theme.angle}deg, ${
                theme.chips.length === 1 ? `${theme.chips[0]}, ${theme.chips[0]}` : theme.chips.join(', ')
              })`,
            }}
          />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Nom (facultatif)
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 40))}
              placeholder="Mon thème sunset"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Message (facultatif)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="Regarde ce thème que j'ai fait ✨"
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
              Envoyer vers
            </label>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Rechercher un salon…"
              className="mb-2"
            />
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60 divide-y divide-border/60">
              {loading ? (
                <div className="p-6 grid place-items-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : grouped.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Aucun salon trouvé.</div>
              ) : (
                grouped.map(([server, list]) => (
                  <div key={server}>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
                      {server}
                    </div>
                    {list.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                      >
                        <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
                        <span className="text-sm text-muted-foreground">#</span>
                        <span translate="no" className="text-sm truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {selected.size} salon(s) sélectionné(s)
            </div>
          </div>
        </div>

        <DialogFooter className="p-5 pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={sending || selected.size === 0}>
            {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
