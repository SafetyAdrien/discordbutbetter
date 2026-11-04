import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Smile, XCircle } from '@/components/icons/discord/lucide';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { useGifSearch } from '@/components/chat/emoji-picker/useGifSearch';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { cn } from '@/lib/utils';
import type { SlashChoice, SlashCommand, SlashOption } from '@/lib/slashCommands';
import { SlashGlyph } from './SlashIcons';

/*
 * Mode "commande" du champ de saisie (video de reference) : barre d'aide en
 * haut (nom + description de l'option en cours, ou erreur en rouge), puis la
 * ligne /commande + une pastille par option (libelle + zone de valeur). Au
 * dessus : liste d'autocompletion (Membres, Options, Options requises /
 * Autres options, GIF). Une pastille vide rouge n'apparait qu'apres y avoir
 * quitte le champ ("touchee") ; Retour arriere vide la valeur puis retire la
 * pastille ; "+ N en plus" compte les options absentes.
 */

export interface SlashMember {
  id: string;
  displayName: string;
  username: string;
  avatar?: string | null;
}

export interface SlashValue {
  text: string;
  userId?: string;
  choice?: string;
}
export type SlashValues = Record<string, SlashValue>;

interface OptState extends SlashValue {
  touched: boolean;
}

const REQUIRED_MSG = 'Cette option est requise. Tu dois entrer une valeur.';
const INVALID_MSG = 'Valeur invalide.';

type Panel =
  | { kind: 'users'; title: string; items: SlashMember[] }
  | { kind: 'choices'; title: string; items: SlashChoice[] }
  | { kind: 'options'; sections: { title: string; items: SlashOption[] }[] }
  | { kind: 'gifs'; query: string }
  | { kind: 'stickers'; query: string; items: StickerHit[] }
  | null;

interface StickerHit {
  id: string;
  name: string;
  url: string;
  serverName: string;
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

interface Props {
  command: SlashCommand;
  members: SlashMember[];
  serverId: string | null;
  onCancel: () => void;
  onSubmit: (values: SlashValues) => void;
  onPickGif: (gif: { url: string; name: string }) => void;
  onPickSticker: (sticker: { url: string; name: string }) => void;
  onSendExternalAttachment?: (attachment: { url: string; name: string; type: 'sticker' | 'gif' }) => void;
}

/** Champ de valeur : s'ajuste a son texte (pas de largeur fixe, comme la video). */
function ValueInput({
  value,
  mention,
  inputRef,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  readOnly,
}: {
  value: string;
  mention?: boolean;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
}) {
  return (
    <span className={cn('relative inline-flex h-[28px] min-w-[22px] items-center', mention ? 'bg-[#4c4f75]' : 'bg-[#474751]')}>
      <span aria-hidden className="invisible whitespace-pre px-2 text-[16px]">{(mention ? '@' : '') + (value || ' ')}</span>
      <input
        ref={inputRef}
        value={mention ? `@${value}` : value}
        readOnly={readOnly || mention}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          'absolute inset-0 h-full w-full bg-transparent px-2 text-[16px] outline-none',
          mention ? 'cursor-default text-[#c9cdfb] caret-transparent' : 'text-white caret-white',
        )}
      />
    </span>
  );
}

export function SlashCommandComposer({ command, members, serverId, onCancel, onSubmit, onPickGif, onPickSticker, onSendExternalAttachment }: Props) {
  const requiredNames = useMemo(() => command.options.filter((o) => o.required).map((o) => o.name), [command]);
  const [shown, setShown] = useState<string[]>(requiredNames);
  const [vals, setVals] = useState<Record<string, OptState>>(() =>
    Object.fromEntries(command.options.map((o) => [o.name, { text: '', touched: false }])),
  );
  const [focus, setFocus] = useState<string | null>(requiredNames[0] ?? null);
  const [sel, setSel] = useState(0);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const freeRef = useRef<HTMLInputElement | null>(null);

  const byName = useMemo(() => Object.fromEntries(command.options.map((o) => [o.name, o])), [command]);
  const ordered = useMemo(() => command.options.filter((o) => shown.includes(o.name)), [command, shown]);
  const missing = useMemo(() => command.options.filter((o) => !shown.includes(o.name)), [command, shown]);

  const focusOption = useCallback((name: string | null) => {
    setFocus(name);
    requestAnimationFrame(() => (name ? refs.current[name] : freeRef.current)?.focus());
  }, []);

  useLayoutEffect(() => {
    focusOption(requiredNames[0] ?? null);
  }, [focusOption, requiredNames]);

  const patch = (name: string, p: Partial<OptState>) => setVals((v) => ({ ...v, [name]: { ...v[name], ...p } }));

  const errorOf = (name: string): string | null => {
    if (!shown.includes(name)) return byName[name].required ? REQUIRED_MSG : null;
    const o = byName[name];
    const v = vals[name];
    if (!v.text.trim()) return o.required ? REQUIRED_MSG : INVALID_MSG;
    if (o.type === 'user' && !v.userId) return INVALID_MSG;
    if (o.type === 'choice' && !v.choice) return INVALID_MSG;
    return null;
  };

  /* ---------------------------- autocompletion --------------------------- */
  const assets = useAllServerAssets(command.name === 'sticker');
  const allStickers = useMemo<StickerHit[]>(() => {
    const names = new Map(assets.servers.map((sv) => [sv.id, sv.name]));
    return assets.stickers.map((st) => ({ id: st.id, name: st.name, url: st.url, serverName: names.get(st.server_id) ?? '' }));
  }, [assets.servers, assets.stickers]);
  const focusedOpt = focus ? byName[focus] : null;
  const focusedVal = focus ? vals[focus] : null;
  const gifQuery = command.name === 'gif' && focusedOpt && focusedVal ? focusedVal.text.trim() : '';
  const stickerQuery = command.name === 'sticker' && focusedOpt && focusedVal ? focusedVal.text.trim() : '';

  const panel = useMemo<Panel>(() => {
    if (focusedOpt && focusedVal) {
      if (focusedOpt.type === 'user') {
        const q = fold(focusedVal.text);
        const items = members.filter((m) => !q || fold(m.displayName).includes(q) || fold(m.username).includes(q)).slice(0, 10);
        if (items.length === 0) return null;
        return { kind: 'users', title: q ? `Membres correspondant à ${focusedVal.text}` : 'Membres', items };
      }
      if (focusedOpt.type === 'choice') {
        const q = fold(focusedVal.text);
        const items = (focusedOpt.choices ?? []).filter((c) => !q || fold(c.name).includes(q));
        if (items.length === 0) return null;
        return { kind: 'choices', title: focusedVal.text ? `Options correspondant à ${focusedVal.text}` : 'Options', items };
      }
      if (command.name === 'gif' && gifQuery) return { kind: 'gifs', query: gifQuery };
      if (command.name === 'sticker' && stickerQuery) {
        const q = fold(stickerQuery);
        const items = allStickers.filter((st) => fold(st.name).includes(q)).slice(0, 25);
        return items.length > 0 ? { kind: 'stickers', query: stickerQuery, items } : null;
      }
      return null;
    }
    if (focus === null && missing.length > 0) {
      const req = missing.filter((o) => o.required);
      const opt = missing.filter((o) => !o.required);
      if (req.length > 0 && opt.length > 0) return { kind: 'options', sections: [{ title: 'Options requises', items: req }, { title: 'Autres options', items: opt }] };
      return { kind: 'options', sections: [{ title: req.length > 0 ? 'Options requises' : 'Options', items: missing }] };
    }
    return null;
  }, [focus, focusedOpt, focusedVal, members, missing, command.name, gifQuery, stickerQuery, allStickers]);

  const panelCount =
    panel?.kind === 'users' || panel?.kind === 'choices' || panel?.kind === 'stickers'
      ? panel.items.length
      : panel?.kind === 'options'
        ? panel.sections.reduce((n, s) => n + s.items.length, 0)
        : 0;

  useEffect(() => setSel(0), [focus, panel?.kind, panelCount, focusedVal?.text]);

  const nextAfter = (name: string): string | null => {
    const i = ordered.findIndex((o) => o.name === name);
    return ordered[i + 1]?.name ?? null;
  };

  const addOption = (name: string) => {
    setShown((s) => [...s, name]);
    focusOption(name);
  };

  const pick = (index: number) => {
    if (!panel) return;
    if (panel.kind === 'users' && focus) {
      const m = panel.items[index];
      if (!m) return;
      patch(focus, { text: m.displayName, userId: m.id });
      focusOption(nextAfter(focus));
    } else if (panel.kind === 'choices' && focus) {
      const c = panel.items[index];
      if (!c) return;
      patch(focus, { text: c.name, choice: c.value });
      focusOption(nextAfter(focus));
    } else if (panel.kind === 'stickers') {
      const st = panel.items[index];
      if (st) onPickSticker({ url: st.url, name: st.name });
    } else if (panel.kind === 'options') {
      const flat = panel.sections.flatMap((s) => s.items);
      const o = flat[index];
      if (o) addOption(o.name);
    }
  };

  /* -------------------------------- envoi -------------------------------- */
  const trySubmit = () => {
    // Option requise retiree : elle revient, vide, et attend une valeur.
    const absent = command.options.find((o) => o.required && !shown.includes(o.name));
    if (absent) {
      setShown((s) => [...s, absent.name]);
      patch(absent.name, { touched: true });
      focusOption(absent.name);
      return;
    }
    const bad = ordered.find((o) => errorOf(o.name));
    if (bad) {
      setVals((v) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, { ...x, touched: true }])));
      focusOption(bad.name);
      return;
    }
    const out: SlashValues = {};
    for (const o of ordered) out[o.name] = { text: vals[o.name].text.trim(), userId: vals[o.name].userId, choice: vals[o.name].choice };
    onSubmit(out);
  };

  /* ------------------------------- clavier ------------------------------- */
  const removeOption = (name: string) => {
    setShown((s) => s.filter((n) => n !== name));
    patch(name, { text: '', userId: undefined, choice: undefined, touched: false });
    focusOption(null);
  };

  const backspaceInto = (name: string) => {
    const v = vals[name];
    if (v.userId) patch(name, { text: '', userId: undefined });
    else if (v.text) patch(name, { text: v.text.slice(0, -1), choice: undefined });
    else removeOption(name);
  };

  const onOptionKey = (name: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    const v = vals[name];
    const idx = ordered.findIndex((o) => o.name === name);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (panelCount === 0) return;
      e.preventDefault();
      setSel((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + panelCount) % panelCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (panelCount > 0 && panel && (panel.kind === 'users' || panel.kind === 'choices' || panel.kind === 'stickers')) pick(sel);
      else trySubmit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey && panelCount > 0 && panel && (panel.kind === 'users' || panel.kind === 'choices')) pick(sel);
      else focusOption(e.shiftKey ? ordered[idx - 1]?.name ?? name : nextAfter(name));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Backspace') {
      const input = e.currentTarget;
      if (v.userId || (input.selectionStart === 0 && input.selectionEnd === 0) || !v.text) {
        if (v.userId || !v.text) {
          e.preventDefault();
          backspaceInto(name);
        }
      }
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0 && idx > 0) {
      e.preventDefault();
      focusOption(ordered[idx - 1].name);
    } else if (e.key === 'ArrowRight' && (v.userId || e.currentTarget.selectionStart === v.text.length)) {
      e.preventDefault();
      focusOption(nextAfter(name));
    }
  };

  const onFreeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (panelCount === 0) return;
      e.preventDefault();
      setSel((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + panelCount) % panelCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      trySubmit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey && panelCount > 0 && panel?.kind === 'options') pick(sel);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const last = ordered[ordered.length - 1];
      if (!last) return;
      focusOption(last.name);
      backspaceInto(last.name);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const last = ordered[ordered.length - 1];
      if (last) focusOption(last.name);
    }
  };

  /* --------------------------- insertion d'emoji -------------------------- */
  const insertEmoji = (emoji: string) => {
    if (!focus || byName[focus].type !== 'string') {
      const target = ordered.find((o) => o.type === 'string');
      if (!target) return;
      patch(target.name, { text: vals[target.name].text + emoji });
      focusOption(target.name);
      return;
    }
    patch(focus, { text: vals[focus].text + emoji });
    focusOption(focus);
  };

  /* -------------------------------- rendu -------------------------------- */
  const headerError = focusedOpt && focusedVal?.touched ? errorOf(focusedOpt.name) : null;
  const optionalLeft = missing.length;

  return (
    <div className="relative w-full min-w-0">
      {panel && (
        <div
          className="absolute bottom-full left-2 right-4 z-30 mb-2 overflow-hidden rounded-lg border border-[#40414a] bg-[#383840] shadow-[0_8px_16px_rgba(0,0,0,0.24)]"
          onMouseDown={(e) => e.preventDefault()}
        >
          {(panel.kind === 'users' || panel.kind === 'choices') && (
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin px-1.5 pb-2">
              <p className="px-1.5 pt-3 pb-2 text-[14px] leading-[18px] font-medium text-[#b5bac1]">{panel.title}</p>
              {panel.kind === 'users'
                ? panel.items.map((m, i) => (
                    <div
                      key={m.id}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => pick(i)}
                      className={cn('flex h-[40px] cursor-pointer items-center gap-2 rounded-[4px] px-2', i === sel && 'bg-[#43434b]')}
                    >
                      {m.avatar ? (
                        <img src={m.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5865f2] text-[11px] font-semibold text-white">{m.displayName.charAt(0).toUpperCase()}</span>
                      )}
                      <span translate="no" className="text-[16px] text-white">{m.displayName}</span>
                      <span translate="no" className="ml-auto text-[12px] text-[#b5bac1]">{m.username}</span>
                    </div>
                  ))
                : panel.items.map((c, i) => (
                    <div
                      key={c.value}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => pick(i)}
                      className={cn('flex h-9 cursor-pointer items-center rounded-[4px] px-2 text-[16px] text-white', i === sel && 'bg-[#43434b]')}
                    >
                      {c.name}
                    </div>
                  ))}
            </div>
          )}

          {panel.kind === 'options' && (
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin px-1.5 pb-2">
              {(() => {
                let n = -1;
                return panel.sections.map((s) => (
                  <div key={s.title}>
                    <p className="px-1.5 pt-3 pb-2 text-[14px] leading-[18px] font-medium text-[#b5bac1]">{s.title}</p>
                    {s.items.map((o) => {
                      const i = ++n;
                      return (
                        <div
                          key={o.name}
                          onMouseEnter={() => setSel(i)}
                          onClick={() => pick(i)}
                          className={cn('flex h-9 cursor-pointer items-center rounded-[4px] px-2', i === sel && 'bg-[#43434b]')}
                        >
                          <span className="text-[16px] text-white">{o.name}</span>
                          <span className="ml-auto text-[12px] text-[#b5bac1]">{o.description}</span>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}

          {panel.kind === 'gifs' && <GifCarousel query={panel.query} onPick={(g) => onPickGif(g)} />}
          {panel.kind === 'stickers' && (
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin px-1.5 pb-1.5">
              <p className="px-1.5 pt-3 pb-2 text-[14px] leading-[18px] font-medium text-[#b5bac1]">
                Autocollants correspondant à {panel.query}
              </p>
              {panel.items.map((st, i) => (
                <div
                  key={st.id}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => pick(i)}
                  className={cn('flex h-[46px] cursor-pointer items-center gap-3 rounded-[4px] px-2', i === sel && 'bg-[#43434b]')}
                >
                  <img src={st.url} alt="" draggable={false} className="h-10 w-10 shrink-0 rounded-[4px] object-contain" />
                  <span translate="no" className="min-w-0 flex-1 truncate text-[16px] text-white">{st.name}</span>
                  <span translate="no" className="shrink-0 pl-3 pr-1 text-[14px] text-[#b5bac1]">{st.serverName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="w-full min-w-0 overflow-hidden rounded-lg border border-[#404048] bg-[#383840]">
        <div className="flex h-9 items-center gap-2 border-b border-[#45454f] bg-[#3a3a44] pl-4 pr-3">
          {focusedOpt ? (
            <>
              <span className="text-[16px] leading-5 font-semibold text-white">{focusedOpt.name}</span>
              <span className={cn('truncate text-[14px] leading-[18px]', headerError ? 'text-[#f23f43]' : 'text-[#b5bac1]')}>
                {headerError ?? focusedOpt.description}
              </span>
            </>
          ) : (
            <>
              <span className="text-[16px] leading-5 font-semibold text-white">/{command.name}</span>
              <span className="truncate text-[14px] leading-[18px] text-[#b5bac1]">{command.description}</span>
            </>
          )}
          <button type="button" aria-label="Annuler la commande" onClick={onCancel} className="ml-auto shrink-0 text-[#b5bac1] transition-colors hover:text-white">
            <XCircle className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div
          className="flex min-h-[56px] items-center gap-3 pl-3 pr-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
              focusOption(null);
            }
          }}
        >
          <SlashGlyph className="h-6 w-6 shrink-0" />
          <span className="ml-3 shrink-0 text-[16px] font-semibold text-white">/{command.name}</span>
          <div
            className="-ml-2 flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 py-2"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                focusOption(null);
              }
            }}
          >
            {ordered.map((o) => {
              const v = vals[o.name];
              const bad = v.touched && !!errorOf(o.name);
              const focused = focus === o.name;
              return (
                <span
                  key={o.name}
                  className={cn(
                    'inline-flex h-[30px] items-stretch overflow-hidden rounded-[4px] border text-[16px]',
                    focused ? 'border-[#3b55b8]' : bad ? 'border-[#b5434b]' : 'border-transparent',
                  )}
                  onMouseDown={(e) => {
                    if (!(e.target instanceof HTMLInputElement)) {
                      e.preventDefault();
                      focusOption(o.name);
                    }
                  }}
                >
                  <span className="flex items-center bg-[#37373f] px-2 text-white">{o.name}</span>
                  <ValueInput
                    value={v.text}
                    mention={o.type === 'user' && !!v.userId}
                    inputRef={(el) => (refs.current[o.name] = el)}
                    onChange={(t) =>
                      patch(o.name, {
                        text: t,
                        userId: o.type === 'user' ? undefined : v.userId,
                        choice: o.type === 'choice' ? undefined : v.choice,
                      })
                    }
                    onFocus={() => setFocus(o.name)}
                    onBlur={() => patch(o.name, { touched: true })}
                    onKeyDown={onOptionKey(o.name)}
                  />
                </span>
              );
            })}
            <input
              ref={freeRef}
              readOnly
              aria-label="Fin de la commande"
              onFocus={() => setFocus(null)}
              onKeyDown={onFreeKey}
              className="-ml-2.5 h-6 w-[3px] bg-transparent text-white caret-white outline-none"
            />
            {optionalLeft > 0 && (
              <span className="text-[16px] text-[#949ba4]">
                {ordered.length === 0 ? `+${optionalLeft} option${optionalLeft > 1 ? 's' : ''}` : `+ ${optionalLeft} en plus`}
              </span>
            )}
          </div>

          <EmojiStickerPicker
            serverId={serverId}
            onEmojiSelect={insertEmoji}
            onStickerSelect={(url, name) => onSendExternalAttachment?.({ url, name, type: 'sticker' })}
            onGifSelect={(url, name) => onSendExternalAttachment?.({ url, name, type: 'gif' })}
            defaultTab="emoji"
            trigger={
              <button type="button" aria-label="Insérer un emoji" className="flex h-8 w-8 shrink-0 items-center justify-center text-[hsl(var(--icon-default))] transition-colors hover:text-white">
                <Smile className="h-[22px] w-[22px]" />
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- carrousels (GIF, autocollants) ---------------------------- */

function Carousel({ title, children, empty }: { title: React.ReactNode; children: React.ReactNode; empty?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: true });
  const sync = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  useEffect(sync, [children]);
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const arrow = 'absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[6px] bg-[#1e1f22] text-white shadow-md transition-colors hover:bg-black';
  return (
    <div className="relative">
      <p className="px-3 pt-3 text-[14px] leading-[18px] text-[#b5bac1]">{title}</p>
      {empty ?? (
        <div ref={ref} onScroll={sync} className="scrollbar-thin flex items-center overflow-x-auto px-1.5 pb-2 pt-2">
          {children}
        </div>
      )}
      {edge.left && (
        <button type="button" aria-label="Précédent" onClick={() => go(-1)} className={cn(arrow, 'left-2')}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {edge.right && !empty && (
        <button type="button" aria-label="Suivant" onClick={() => go(1)} className={cn(arrow, 'right-2')}>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function GifCarousel({ query, onPick }: { query: string; onPick: (g: { url: string; name: string }) => void }) {
  const { data = [], isLoading } = useGifSearch(query);
  return (
    <Carousel
      title={<>Gif correspond à <span className="font-semibold text-white">{query}</span></>}
      empty={!isLoading && data.length === 0 ? <p className="px-3 py-4 text-[14px] text-[#b5bac1]">Aucun GIF trouvé.</p> : undefined}
    >
      {data.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onPick({ url: g.url, name: g.title || 'gif' })}
          className="shrink-0 rounded-lg p-2 transition-colors hover:bg-[#43434b]"
        >
          <img src={g.previewUrl || g.url} alt={g.title} draggable={false} loading="lazy" style={{ height: 150, width: Math.round((150 * g.width) / Math.max(1, g.height)) }} className="block rounded-[4px] object-cover" />
        </button>
      ))}
    </Carousel>
  );
}
