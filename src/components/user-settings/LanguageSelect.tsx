import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp } from '@/components/icons/discord/lucide';
import { LANGUAGES, findLanguage, isLanguageAvailable } from '@/i18n/languages';
import { normalizeForSearch, cn } from '@/lib/utils';

/*
 * "Selectionne une langue" (video de reference) : champ avec drapeau et nom
 * natif, le nom de la langue dans la langue de l'interface a droite ; a
 * l'ouverture le champ devient une recherche et la liste defile sous lui.
 * Les langues sans traduction restent visibles mais "Bientot disponible".
 */
export function LanguageSelect({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = findLanguage(value);

  const list = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    return q ? LANGUAGES.filter((l) => normalizeForSearch(`${l.native} ${l.label} ${l.code}`).includes(q)) : LANGUAGES;
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(Math.max(0, LANGUAGES.findIndex((l) => l.code === current.code)));
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      rootRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    });
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, current.code]);

  const choose = (code: string) => {
    const l = findLanguage(code);
    if (!isLanguageAvailable(l)) return;
    onChange(l.code);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div className="h-10 px-3 flex items-center gap-2 rounded-lg bg-[hsl(var(--search-background))] border border-primary">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls="language-listbox"
            aria-label="Rechercher une langue"
            value={query}
            placeholder={current.native}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((i) => Math.min(list.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                if (list[active]) choose(list[active].code);
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                setOpen(false);
              }
            }}
            className="flex-1 min-w-0 bg-transparent outline-none text-base text-foreground placeholder:text-foreground"
          />
          <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="text-[hsl(var(--icon-default))]">
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full h-10 px-3 flex items-center gap-2 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] text-left text-base text-foreground"
        >
          <span aria-hidden="true">{current.flag}</span>
          <span translate="no" className="flex-1 min-w-0 truncate">{current.native}</span>
          <span className="shrink-0 text-sm text-muted-foreground">{current.label}</span>
          <ChevronDown className="w-5 h-5 shrink-0 text-[hsl(var(--icon-default))]" />
        </button>
      )}

      {open && (
        <div
          id="language-listbox"
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1 max-h-[208px] overflow-y-auto scrollbar-thin p-1 rounded-lg bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] shadow-xl"
        >
          {list.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Aucune langue trouvée.</p>}
          {list.map((l, i) => {
            const available = isLanguageAvailable(l);
            const selected = l.code === current.code;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={!available}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(l.code)}
                className={cn(
                  'w-full min-h-9 px-3 py-1.5 rounded flex items-center gap-2 text-left text-base',
                  available ? 'text-foreground' : 'text-muted-foreground cursor-not-allowed',
                  i === active && 'bg-[hsl(var(--interactive-background-hover))]',
                )}
              >
                <span aria-hidden="true" className={cn(!available && 'opacity-50')}>{l.flag}</span>
                <span translate="no" className="flex-1 min-w-0 truncate">{l.native}</span>
                {available ? (
                  <span className="text-sm text-muted-foreground">{l.label}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Bientôt disponible</span>
                )}
                {selected && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
