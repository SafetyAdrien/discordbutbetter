import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Check, ChevronDown, ChevronRight, Info } from '@/components/icons/discord/lucide';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComingSoonBadge } from '@/components/server-settings/SettingsUI';
import { cn } from '@/lib/utils';

/*
 * Briques des Parametres utilisateur Discord 2025 (video de reference) :
 * sections a titre 20px separees par un filet, lignes "titre + description
 * a gauche, controle a droite", listes radio, menus deroulants avec coche,
 * curseurs gradues, cartes "Parametres connexes", bandeaux info/alerte.
 */

export function USection({ id, title, description, action, children, className }: {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section data-settings-section-id={id} className={cn('py-8 border-b border-white/[0.06] last:border-b-0 first:pt-2 scroll-mt-4', className)}>
      {title && (
        <div className="mb-4 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white leading-6">{title}</h2>
            {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function URow({ title, description, children, disabled, soon, onClick }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  soon?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className={cn('flex items-center gap-6', (disabled || soon) && 'opacity-60', onClick && 'cursor-pointer')} onClick={onClick}>
      <div className="flex-1 min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-base font-medium text-white leading-5">
          {title}
          {soon && <ComingSoonBadge />}
        </p>
        {description && <div className="mt-1 text-sm leading-[18px] text-muted-foreground">{description}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

export function UToggle({ title, description, checked, onChange, soon, disabled }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange?: (v: boolean) => void;
  soon?: boolean;
  disabled?: boolean;
}) {
  return (
    <URow title={title} description={description} soon={soon} disabled={disabled}>
      <Switch checked={checked} disabled={soon || disabled || !onChange} onCheckedChange={onChange} aria-label={typeof title === 'string' ? title : undefined} />
    </URow>
  );
}

export function URadioGroup<T extends string>({ label, description, value, options, onChange, disabled }: {
  label?: React.ReactNode;
  description?: React.ReactNode;
  value: T;
  options: { value: T; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn(disabled && 'opacity-60')}>
      {label && <p className="text-base font-medium text-white">{label}</p>}
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div role="radiogroup" className={cn('space-y-3', (label || description) && 'mt-3')}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className="w-full flex items-start gap-3 text-left disabled:cursor-not-allowed"
          >
            <span className={cn('mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors', value === o.value ? 'border-primary bg-white' : 'border-[hsl(var(--header-icon))]')}>
              {value === o.value && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </span>
            <span className="min-w-0">
              <span className="block text-base text-foreground leading-5">{o.label}</span>
              {o.description && <span className="block mt-0.5 text-sm text-muted-foreground">{o.description}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function USelect<T extends string>({ value, options, onChange, className, icon, disabled }: {
  value: T;
  options: { value: T; label: React.ReactNode; hint?: React.ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'w-full h-10 px-3 flex items-center gap-2 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] text-left text-base text-foreground transition-colors disabled:opacity-60',
            open && 'border-primary',
            className,
          )}
        >
          {icon}
          <span className="flex-1 min-w-0 truncate">{current?.label}</span>
          {current?.hint && <span className="shrink-0 text-sm text-muted-foreground">{current.hint}</span>}
          <ChevronDown className={cn('w-5 h-5 shrink-0 text-[hsl(var(--icon-default))] transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1 bg-[hsl(var(--surface-card))] border-[hsl(var(--border-subtle))]">
        <div className="max-h-[260px] overflow-y-auto scrollbar-thin">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={cn('w-full min-h-9 px-3 py-1.5 rounded flex items-center gap-2 text-left text-base text-foreground hover:bg-[hsl(var(--interactive-background-hover))]', o.value === value && 'bg-[hsl(var(--interactive-background-selected))] text-white')}
            >
              <span className="flex-1 min-w-0 truncate">{o.label}</span>
              {o.hint && <span className="text-sm text-muted-foreground">{o.hint}</span>}
              {o.value === value && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Bulle de valeur au-dessus de la pastille d'un curseur (survol / glissement), meme style que les infobulles. */
export function SliderBubble({ text, left, show }: { text: string; left: string; show: boolean }) {
  return (
    <span
      className={cn('absolute -top-9 -translate-x-1/2 h-7 px-2.5 rounded-lg border border-[color:var(--tooltip-border)] bg-[hsl(var(--tooltip-bg))] text-sm font-medium leading-[26px] text-[hsl(var(--tooltip-fg))] pointer-events-none whitespace-nowrap transition-opacity duration-75', show ? 'opacity-100' : 'opacity-0')}
      style={{ left }}
    >
      {text}
      <span className="absolute left-1/2 -bottom-1 -ml-1 w-2 h-2 rotate-45 bg-[hsl(var(--tooltip-bg))] border-b border-r border-[color:var(--tooltip-border)]" />
    </span>
  );
}

/** Curseur gradue a la Discord : etiquettes au-dessus, valeur courante en vert. */
/*
 * Curseur gradue de Discord (video de reference) : libelles au-dessus des
 * reperes, rail de 5px, repere de 18px, pastille ronde blanche de 24px, la
 * valeur courante en vert.
 */
export function UMarkedSlider({ value, marks, onChange, format = (v) => String(v), min, max, step = 1, disabled }: {
  value: number;
  marks: number[];
  onChange: (v: number) => void;
  format?: (v: number) => string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  const lo = min ?? marks[0];
  const hi = max ?? marks[marks.length - 1];
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  // Les reperes sont rentres de 4px : le rail et la pastille depassent un peu aux extremites.
  const left = (v: number) => `calc(4px + (100% - 8px) * ${pct(v) / 100})`;
  const [active, setActive] = useState(false);
  return (
    <div className={cn('pt-8 pb-1', disabled && 'opacity-50')}>
      <div className="relative h-6" onPointerEnter={() => setActive(true)} onPointerLeave={() => setActive(false)}>
        {marks.map((m) => (
          <span key={m} className={cn('absolute -top-7 -translate-x-1/2 text-sm leading-4 whitespace-nowrap', m === value ? 'text-[hsl(var(--online))]' : 'text-[hsl(var(--header-icon))]')} style={{ left: left(m) }}>
            {format(m)}
          </span>
        ))}
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-[5px] rounded-full bg-[hsl(var(--button-secondary))]" />
        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[5px] rounded-full bg-primary" style={{ width: `calc(4px + (100% - 8px) * ${pct(value) / 100})` }} />
        {marks.map((m) => (
          <span key={`t${m}`} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-[18px] rounded-full bg-[hsl(var(--header-icon))]/45" style={{ left: left(m) }} />
        ))}
        <input
          type="range"
          min={lo}
          max={hi}
          step={step}
          value={value}
          disabled={disabled}
          aria-valuetext={format(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] pointer-events-none transition-[left] duration-75" style={{ left: left(value) }} />
        <SliderBubble text={format(value)} left={left(value)} show={active && !disabled} />
      </div>
    </div>
  );
}

export function URelated({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick?: () => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">Paramètres connexes</p>
      <button type="button" onClick={onClick} disabled={!onClick} className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg text-left hover:bg-[hsl(var(--interactive-background-hover))] disabled:hover:bg-transparent">
        <span className="w-10 h-10 shrink-0 rounded-lg bg-[hsl(var(--surface-card))] flex items-center justify-center text-white">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-base font-medium text-white">{title}</span>
          <span className="block text-sm text-muted-foreground">{description}</span>
        </span>
        {onClick && <ChevronRight className="w-5 h-5 text-[hsl(var(--icon-default))]" />}
      </button>
    </div>
  );
}

export function UBanner({ tone = 'info', children, onDismiss }: { tone?: 'info' | 'warning'; children: React.ReactNode; onDismiss?: () => void }) {
  const Icon = tone === 'info' ? Info : AlertTriangle;
  return (
    <div className={cn('flex items-start gap-2 px-3 py-2.5 rounded-lg border text-sm text-foreground', tone === 'info' ? 'border-primary/70 bg-primary/10' : 'border-[#f0b232]/70 bg-[#f0b232]/10')}>
      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', tone === 'info' ? 'text-primary' : 'text-[#f0b232]')} />
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Masquer" className="text-[hsl(var(--icon-default))] hover:text-white">×</button>
      )}
    </div>
  );
}

export function UButton({ children, onClick, tone = 'secondary', disabled, className }: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: 'primary' | 'secondary' | 'danger' | 'danger-outline';
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-9 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        tone === 'primary' && 'bg-primary hover:bg-primary/90 text-white',
        tone === 'secondary' && 'bg-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--interactive-background-selected))] text-white',
        tone === 'danger' && 'bg-[#da373c] hover:bg-[#a12828] text-white',
        tone === 'danger-outline' && 'bg-[hsl(var(--button-secondary))] hover:bg-[#da373c] text-[#f57976] hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  );
}
