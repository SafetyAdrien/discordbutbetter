import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';

/*
 * Liste deroulante avec recherche, comme "Selectionner le salon" de Discord :
 * le champ affiche l'option choisie, on tape pour filtrer, fleches + Entree
 * pour choisir, coche sur l'option active.
 */
export interface SearchableOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export function SearchableSelect({ value, options, onChange, placeholder, disabled, emptyLabel = 'Aucun résultat', ariaLabel }: {
  value: string;
  options: SearchableOption[];
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  emptyLabel?: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  useEffect(() => setActive(Math.max(0, filtered.findIndex((o) => o.value === value))), [filtered, value]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <div className={cn('flex items-center gap-2 h-11 px-3 rounded-lg bg-[hsl(var(--search-background))] border transition-colors', open ? 'border-primary' : 'border-white/[0.06]', disabled && 'opacity-50')}>
        {!open && current?.icon}
        <input
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          value={open ? query : current?.label ?? ''}
          placeholder={open && current ? current.label : placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(filtered.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter' && filtered[active]) {
              e.preventDefault();
              choose(filtered[active].value);
            } else if (e.key === 'Escape') {
              e.stopPropagation();
              setOpen(false);
            }
          }}
          className="flex-1 min-w-0 bg-transparent text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none disabled:cursor-not-allowed"
        />
        <ChevronDown className={cn('w-5 h-5 shrink-0 text-[hsl(var(--icon-default))] transition-transform', open && 'rotate-180')} />
      </div>
      {open && !disabled && (
        <div role="listbox" className="absolute z-20 left-0 right-0 mt-1 max-h-[220px] overflow-y-auto scrollbar-thin p-1 rounded-lg bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))] shadow-xl">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            filtered.map((o, i) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o.value)}
                className={cn('w-full h-10 px-3 rounded flex items-center gap-2 text-left text-base text-foreground', i === active && 'bg-[hsl(var(--interactive-background-hover))]', o.value === value && 'text-white')}
              >
                {o.icon}
                <span className="flex-1 min-w-0 truncate">{o.label}</span>
                {o.value === value && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
