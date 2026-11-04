import { useEffect, useMemo, useRef, useState } from 'react';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { recordSlashUsage, useSlashUsage, type SlashCommand } from '@/lib/slashCommands';
import { SlashCommandMenu, buildSlashMenuModel } from './SlashCommandMenu';
import { SlashCommandComposer, type SlashMember, type SlashValues } from './SlashCommandComposer';
import { useAvailableSlashCommands, useSlashExecutor, type SlashHandlers } from './useSlashExecutor';

/** "/", "/ba"... : le menu s'ouvre tant que le brouillon est un seul mot commencant par "/". */
const MENU_RE = /^\/([^\s/]*)$/;

/*
 * Couche "menu" : rendue par le champ de saisie. Ecoute les touches du champ
 * (fleches, Entree, Tab, Echap) AVANT son gestionnaire, pour ne rien changer
 * a la saisie normale quand le menu est ferme.
 */
export function SlashMenuLayer({
  value,
  serverId,
  textareaRef,
  enabled,
  onPick,
}: {
  value: string;
  serverId: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  enabled: boolean;
  onPick: (cmd: SlashCommand) => void;
}) {
  const commands = useAvailableSlashCommands(serverId);
  const counts = useSlashUsage();
  const match = enabled ? MENU_RE.exec(value) : null;
  const query = match?.[1] ?? '';
  const model = useMemo(() => buildSlashMenuModel(commands, query, counts), [commands, query, counts]);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const open = !!match && model.flat.length > 0 && dismissedFor !== value;

  useEffect(() => setSelected(0), [query]);

  // "/ban " tape en entier : la commande se selectionne toute seule.
  useEffect(() => {
    if (!enabled) return;
    const m = /^\/([^\s/]+)\s$/.exec(value);
    if (!m) return;
    const exact = commands.find((c) => c.name === m[1].toLowerCase());
    if (exact) onPick(exact);
  }, [value, commands, enabled, onPick]);

  const stateRef = useRef({ open, model, selected, onPick });
  stateRef.current = { open, model, selected, onPick };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s.open) return;
      const n = s.model.flat.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelected((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (e.shiftKey && e.key === 'Enter') return;
        e.preventDefault();
        e.stopPropagation();
        const c = s.model.flat[s.selected];
        if (c) s.onPick(c);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setDismissedFor(el.value);
      }
    };
    el.addEventListener('keydown', onKey, true);
    return () => el.removeEventListener('keydown', onKey, true);
  }, [textareaRef]);

  if (!open) return null;
  return <SlashCommandMenu model={model} query={query} selectedIndex={selected} onHover={setSelected} onPick={onPick} />;
}

/** Couche "commande" : remplace le champ de saisie tant qu'une commande est en cours. */
export function SlashCommandRunner({
  command,
  serverId,
  channelId,
  members,
  handlers,
  onDone,
}: {
  command: SlashCommand;
  serverId: string | null;
  channelId: string | null;
  members: SlashMember[];
  handlers: SlashHandlers;
  onDone: () => void;
}) {
  const stickers = useAllServerAssets(command.name === 'sticker').stickers;
  const run = useSlashExecutor({ serverId, channelId, members, handlers, stickers });

  const submit = (values: SlashValues) => {
    onDone();
    void run(command, values);
  };

  return (
    <SlashCommandComposer
      command={command}
      members={members}
      serverId={serverId}
      onCancel={onDone}
      onSubmit={submit}
      onPickGif={(g) => {
        recordSlashUsage(command.id);
        handlers.sendExternal({ url: g.url, name: g.name, type: 'gif' });
        onDone();
      }}
      onPickSticker={(s) => {
        recordSlashUsage(command.id);
        handlers.sendExternal({ url: s.url, name: s.name, type: 'sticker' });
        onDone();
      }}
      onSendExternalAttachment={(a) => handlers.sendExternal(a)}
    />
  );
}

