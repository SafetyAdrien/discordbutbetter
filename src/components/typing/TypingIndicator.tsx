import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTypingUsers } from '@/hooks/useTypingIndicator';
import { formatTypingUsers, getTypingUserName, type TypingUser } from '@/lib/typingIndicator';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  channelId?: string | null;
  conversationId?: string | null;
  threadId?: string | null;
}

interface TypingIndicatorContentProps {
  users: TypingUser[];
  variant?: 'inline' | 'bubble';
  className?: string;
}

function TypingDots({ muted = false }: { muted?: boolean }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            'h-1.5 w-1.5 rounded-full motion-safe:animate-bounce motion-reduce:animate-none',
            muted ? 'bg-muted-foreground/70' : 'bg-primary',
          )}
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </span>
  );
}

export function TypingIndicatorContent({
  users,
  variant = 'inline',
  className,
}: TypingIndicatorContentProps) {
  if (users.length === 0) return null;

  const label = formatTypingUsers(users);

  if (variant === 'bubble') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'flex min-w-0 max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-md bg-[hsl(var(--surface-2))] px-3 py-2 text-xs text-muted-foreground',
          className,
        )}
      >
        <TypingDots muted />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  // Reference : barre de 24 px au-dessus du champ de saisie, trois points qui s'allument a tour de role (alignes sur le "+"),
  // puis "Nom est en train d'ecrire..." (noms en gras).
  const names = users.map((u) => getTypingUserName(u));
  const bold = (n: string) => <strong key={n} translate="no" className="font-semibold text-white">{n}</strong>;
  let text: React.ReactNode;
  if (names.length === 1) text = <>{bold(names[0])} est en train d'écrire...</>;
  else if (names.length === 2) text = <>{bold(names[0])} et {bold(names[1])} sont en train d'écrire...</>;
  else if (names.length === 3) text = <>{bold(names[0])}, {bold(names[1])} et {bold(names[2])} sont en train d'écrire...</>;
  else text = <>Plusieurs personnes sont en train d'écrire...</>;

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={cn('flex h-6 shrink-0 items-center px-4 text-xs leading-4 text-[#dbdee1]', className)}>
      <span className="flex w-[45px] shrink-0 items-center justify-center gap-[4px]" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-[5px] w-[5px] rounded-full bg-white" style={{ animationDelay: `${i * 0.22}s` }} />
        ))}
      </span>
      <span className="ml-[14px] min-w-0 truncate">{text}</span>
    </div>
  );
}

export function TypingIndicator({ channelId, conversationId, threadId }: TypingIndicatorProps) {
  const { data: typingUsers = [] } = useTypingUsers(channelId, conversationId, threadId);
  return <TypingIndicatorContent users={typingUsers} />;
}
