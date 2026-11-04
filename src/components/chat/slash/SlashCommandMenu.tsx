import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Clock } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import {
  BUILTIN_SOURCE,
  frequentCommands,
  optionalOptions,
  requiredOptions,
  searchCommands,
  type SlashCommand,
} from '@/lib/slashCommands';
import { SlashGlyph } from './SlashIcons';

/*
 * Menu des commandes slash (video de reference) : panneau pleine largeur au
 * dessus du champ de saisie, rail d'icones a gauche (Frequemment utilises /
 * origine), sections a en-tete collant, ligne = nom + puces des options au
 * survol + description + origine a droite. Filtre : "Commande(s)
 * correspondant a /x", sans rail.
 */

export interface MenuSection {
  id: string;
  title: string;
  kind: 'frequent' | 'source';
  rows: SlashCommand[];
}

export interface SlashMenuModel {
  filtered: boolean;
  sections: MenuSection[];
  /** Ordre de navigation au clavier. */
  flat: SlashCommand[];
}

export function buildSlashMenuModel(commands: SlashCommand[], query: string, counts: Record<string, number>): SlashMenuModel {
  if (query.trim()) {
    const rows = searchCommands(commands, query, counts);
    return { filtered: true, sections: [{ id: 'results', title: '', kind: 'source', rows }], flat: rows };
  }
  const sections: MenuSection[] = [];
  const frequent = frequentCommands(commands, counts);
  if (frequent.length > 0) sections.push({ id: 'frequent', title: 'Fréquemment utilisés', kind: 'frequent', rows: frequent });
  sections.push({ id: 'source', title: BUILTIN_SOURCE, kind: 'source', rows: commands });
  return { filtered: false, sections, flat: sections.flatMap((s) => s.rows) };
}

function OptionChips({ cmd }: { cmd: SlashCommand }) {
  const required = requiredOptions(cmd);
  const optional = optionalOptions(cmd);
  if (required.length === 0 && optional.length === 0) return null;
  return (
    <>
      {required.map((o) => (
        <span key={o.name} className="ml-2 first:ml-2.5 rounded-[4px] bg-black px-1.5 text-[14px] leading-[20px] font-normal text-white">
          {o.name}
        </span>
      ))}
      {optional.length > 0 && (
        <span className="ml-2.5 text-[14px] leading-[20px] font-normal text-[#949ba4]">+ {optional.length} facultatif{optional.length > 1 ? 's' : ''}</span>
      )}
    </>
  );
}

interface Props {
  model: SlashMenuModel;
  query: string;
  selectedIndex: number;
  onHover: (index: number) => void;
  onPick: (cmd: SlashCommand) => void;
}

export function SlashCommandMenu({ model, query, selectedIndex, onHover, onPick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState(model.sections[0]?.id ?? '');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Garde la ligne selectionnee (clavier) visible, sous l'en-tete collant.
  useLayoutEffect(() => {
    const root = scrollRef.current;
    const el = root?.querySelector<HTMLElement>('[data-selected="true"]');
    if (!root || !el) return;
    const top = el.offsetTop - 36;
    const bottom = el.offsetTop + el.offsetHeight;
    if (top < root.scrollTop) root.scrollTop = Math.max(0, top);
    else if (bottom > root.scrollTop + root.clientHeight) root.scrollTop = bottom - root.clientHeight;
  }, [selectedIndex, query]);

  // Rail : l'icone active suit la section visible en haut de la liste.
  const syncActive = () => {
    const root = scrollRef.current;
    if (!root || model.filtered) return;
    let current = model.sections[0]?.id ?? '';
    for (const s of model.sections) {
      const el = sectionRefs.current[s.id];
      if (el && el.offsetTop - 2 <= root.scrollTop) current = s.id;
    }
    setActiveSection(current);
  };
  useEffect(syncActive, [model]);

  const scrollToSection = (id: string) => {
    const root = scrollRef.current;
    const el = sectionRefs.current[id];
    if (root && el) root.scrollTop = el.offsetTop;
  };

  const flatIndex = useMemo(() => {
    const map = new Map<string, number>();
    let i = 0;
    for (const s of model.sections) for (const c of s.rows) map.set(`${s.id}:${c.id}`, i++);
    return map;
  }, [model]);

  const showIcons = (kind: MenuSection['kind']) => model.filtered || kind === 'frequent';

  return (
    <div
      role="listbox"
      aria-label="Commandes"
      className="absolute bottom-full left-2 right-4 z-30 mb-[6px] flex max-h-[420px] overflow-hidden rounded-lg border border-[#40414a] bg-[#383840] shadow-[0_8px_16px_rgba(0,0,0,0.24)]"
      onMouseDown={(e) => e.preventDefault()}
    >
      {!model.filtered && (
        <div className="flex w-[48px] shrink-0 flex-col items-center gap-1 bg-[#2a2a32] py-2.5">
          {model.sections.map((s, i) => (
            <div key={s.id} className="flex w-full flex-col items-center">
              {i > 0 && model.sections.length > 1 && s.kind === 'source' && <div className="mb-1 h-px w-6 bg-white/[0.06]" />}
              <button
                type="button"
                aria-label={s.title}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                  activeSection === s.id ? 'bg-[#32323a]' : 'hover:bg-[#32323a]',
                )}
              >
                {s.kind === 'frequent' ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#2b2d31]">
                    <Clock className="h-4 w-4" />
                  </span>
                ) : (
                  <SlashGlyph className="h-6 w-6" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} onScroll={syncActive} className="scrollbar-thin relative min-w-0 flex-1 overflow-y-auto pr-1">
        {model.filtered && (
          <p className="px-3 pt-[14px] pb-2 text-[14px] leading-[18px] font-medium text-[#b5bac1]">Commande(s) correspondant à /{query.trim()}</p>
        )}
        {model.sections.map((s) => (
          <div key={s.id} ref={(el) => (sectionRefs.current[s.id] = el)} className={cn(!model.filtered && 'pb-1')}>
            {!model.filtered && (
              <div className="sticky top-0 z-10 flex h-9 items-center gap-1.5 bg-[#383840] px-3 pt-1 text-[14px] font-semibold text-[#dbdee1]">
                {s.kind === 'frequent' ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#b5bac1] text-[#383840]">
                    <Clock className="h-3 w-3" />
                  </span>
                ) : (
                  <SlashGlyph className="h-4 w-4 rounded-[3px]" />
                )}
                {s.title}
              </div>
            )}
            <div className="px-2">
              {s.rows.map((c) => {
                const index = flatIndex.get(`${s.id}:${c.id}`) ?? 0;
                const selected = index === selectedIndex;
                const hover = hovered === `${s.id}:${c.id}`;
                return (
                  <div
                    key={c.id}
                    role="option"
                    aria-selected={selected}
                    data-selected={selected}
                    onMouseEnter={() => {
                      setHovered(`${s.id}:${c.id}`);
                      onHover(index);
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onPick(c)}
                    className={cn(
                      'flex h-14 cursor-pointer items-center gap-3 rounded-[4px] px-2',
                      (selected || hover) && 'bg-[#43434b]',
                    )}
                  >
                    {showIcons(s.kind) && <SlashGlyph className="h-[30px] w-[30px] rounded-[7px]" />}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center truncate text-[16px] leading-5 font-medium text-white">
                        /{c.name}
                        {(selected || hover) && <OptionChips cmd={c} />}
                      </p>
                      <p translate="no" className="truncate text-[14px] leading-[18px] text-[#b5bac1]">{c.description}</p>
                    </div>
                    <span className="shrink-0 pr-1 text-[14px] text-[#b5bac1]">{c.source}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
