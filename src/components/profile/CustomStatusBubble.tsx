import { Pencil, Plus, Trash2 } from '@/components/icons/discord/lucide';
import { splitCustomStatus } from '@/lib/customStatus';
import { StatusEmoji } from './StatusEmoji';
import { cn } from '@/lib/utils';

interface CustomStatusBubbleProps {
  customStatus?: string | null;
  /** User presence status. When 'offline', the bubble never renders (global rule). */
  status?: string | null;
  /** Ouvre la fenetre "Definir ton statut" (profil personnel uniquement). */
  onClick?: () => void;
  /** Efface le statut : affiche les boutons modifier / supprimer au survol (profil personnel). */
  onClear?: () => void;
  size?: 'sm' | 'md' | 'lg';
  /** Show the "Le meilleur émoji pour décrire ta journée ?" prompt when there is no status (own profile). */
  showPlaceholder?: boolean;
  /** Texte d'invite quand aucun statut n'est defini. */
  placeholder?: string;
  className?: string;
}

/**
 * Bulle de statut personnalise (reference : profil Discord). Pastille sombre translucide
 * qui passe sur deux lignes, deux petites bulles de "pensee" vers l'avatar, emoji puis
 * texte ; l'invite du profil personnel est en italique avec un "+". Au survol de son
 * propre statut, deux boutons (modifier / supprimer) flottent au-dessus de la bulle.
 */
export function CustomStatusBubble({
  customStatus,
  status,
  onClick,
  onClear,
  size = 'md',
  showPlaceholder = false,
  placeholder = "À quoi penses-tu en ce moment ?",
  className,
}: CustomStatusBubbleProps) {
  // Global rule: never show a custom status (nor placeholder) when offline.
  if (status === 'offline') return null;
  if (!customStatus && !showPlaceholder) return null;

  const { emoji, text } = splitCustomStatus(customStatus);
  const sizeClasses = {
    sm: { text: 'text-base', maxW: 'max-w-[216px]' },
    md: { text: 'text-base', maxW: 'max-w-[260px]' },
    lg: { text: 'text-base', maxW: '' },
  }[size];

  const Component = onClick ? 'button' : 'div';
  const editable = !!onClick && !!customStatus;
  const bg = 'bg-[#3e3e48]';

  return (
    <div className={cn('relative group/bubble inline-flex', className)}>
      {/* Pastilles de pensee : la grande se glisse derriere la bulle, la petite flotte au-dessus */}
      <span aria-hidden className={cn('absolute left-[13px] -top-[16px] w-[22px] h-[22px] rounded-full', 'bg-[#3e3e46]')} />
      <span aria-hidden className="absolute -left-[4px] -top-[19px] w-3 h-3 rounded-full bg-[#3e3e46]" />
      {editable && onClear && (
        <div className="absolute -top-[18px] right-1 z-10 flex items-center rounded-full bg-[hsl(220_8%_14%)] shadow-md opacity-0 pointer-events-none group-hover/bubble:opacity-100 group-hover/bubble:pointer-events-auto group-focus-within/bubble:opacity-100 group-focus-within/bubble:pointer-events-auto transition-opacity duration-100">
          <button type="button" aria-label="Modifier le statut" onClick={onClick} className="w-7 h-7 flex items-center justify-center rounded-full text-[hsl(var(--icon-default))] hover:text-white transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" aria-label="Supprimer le statut" onClick={onClear} className="w-7 h-7 flex items-center justify-center rounded-full text-[hsl(var(--icon-default))] hover:text-[#f23f42] transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <Component
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        aria-label={onClick ? (customStatus ? 'Modifier le statut personnalisé' : 'Définir un statut personnalisé') : undefined}
        className={cn(
          'relative inline-flex items-center text-left rounded-[16px] gap-2 px-3.5 py-[9px] min-h-[44px]',
          bg,
          onClick && 'hover:bg-[#44444f] transition-colors cursor-pointer',
          sizeClasses.maxW,
        )}
      >
        {!customStatus && <Plus className="w-5 h-5 shrink-0 text-[#b5b5c0]" strokeWidth={2.25} />}
        {emoji && <StatusEmoji emoji={emoji} className="w-5 h-5 text-[18px]" />}
        <span
          className={cn(
            'min-w-0 break-words line-clamp-3 leading-[1.25]',
            sizeClasses.text,
            customStatus ? 'text-foreground' : 'italic text-[#9b9ba8]',
          )}
        >
          {customStatus ? text : placeholder}
        </span>
      </Component>
    </div>
  );
}
