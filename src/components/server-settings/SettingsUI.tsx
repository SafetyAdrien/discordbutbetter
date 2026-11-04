import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

/*
 * Briques communes des pages de parametres du serveur, d'apres la video :
 * titre 20px semi-gras + description, sections separees par un filet,
 * lignes "titre / description / interrupteur", barre "modifications non
 * enregistrees" en bas de page.
 */

export function SettingsPage({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!title && !description && !actions) return <div className={cn("pb-24", className)}>{children}</div>;
  return (
    <div className={cn("pb-24", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-6 text-white">{title}</h2>
          {description && <div className="mt-1 text-sm leading-[18px] text-foreground">{description}</div>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function SettingsDivider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border my-8", className)} />;
}

export function SettingsSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {description && <div className="mt-1 text-sm leading-[18px] text-muted-foreground">{description}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="inline-flex items-center h-4 px-1.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[hsl(var(--button-secondary))] text-muted-foreground">
      Bientôt disponible
    </span>
  );
}

export function SettingsToggleRow({
  title,
  description,
  badge,
  checked,
  onCheckedChange,
  disabled,
  comingSoon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  checked: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b border-border last:border-b-0">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-white">
          {title}
          {badge}
          {comingSoon && <ComingSoonBadge />}
        </p>
        {description && <div className="mt-1 text-sm leading-[18px] text-muted-foreground">{description}</div>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled || comingSoon}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}

/** Ligne "valeur actuelle + Modifier" (niveau de verification, filtres...). */
export function SettingsValueRow({
  value,
  hint,
  actionLabel = "Modifier",
  onAction,
  disabled,
}: {
  value: React.ReactNode;
  hint?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg bg-[hsl(var(--card))]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={disabled}
        className="shrink-0 text-sm font-medium text-[hsl(var(--text-link))] hover:underline disabled:opacity-50 disabled:no-underline"
      >
        {actionLabel}
      </button>
    </div>
  );
}

/** Barre flottante "Attention, il reste des modifications non enregistrees !" */
export function UnsavedChangesBar({
  visible,
  onReset,
  onSave,
  saving,
}: {
  visible: boolean;
  onReset: () => void;
  onSave: () => void;
  saving?: boolean;
}) {
  if (!visible) return null;
  return (
    <div className="sticky bottom-5 z-20 mt-8 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#111214] shadow-[0_8px_24px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-2 fade-in duration-200">
      <p className="flex-1 min-w-0 text-sm font-medium text-white truncate">
        Attention, il reste des modifications non enregistrées !
      </p>
      <button type="button" onClick={onReset} className="shrink-0 px-2 text-sm font-medium text-white hover:underline">
        Réinitialiser
      </button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={saving}
        className="shrink-0 bg-[#248046] hover:bg-[#1a6334] text-white"
      >
        Enregistrer les modifications
      </Button>
    </div>
  );
}

/** Etat vide centre avec illustration (bannissements, emojis...). */
export function SettingsEmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center py-16", className)}>
      {icon && <div className="mb-6 text-[hsl(var(--header-icon))]">{icon}</div>}
      <p className="text-base font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {description && <div className="mt-2 max-w-[300px] text-sm text-muted-foreground">{description}</div>}
    </div>
  );
}
