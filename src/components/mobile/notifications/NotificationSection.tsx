import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface Props {
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function NotificationSection({ label, count, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;

  return (
    <section>
      <button
        onClick={() => {
          haptics.light();
          setOpen((v) => !v);
        }}
        className="w-full flex items-center gap-2 px-4 py-2 sticky top-0 z-[5] bg-background/95 backdrop-blur-sm"
      >
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform',
            !open && '-rotate-90'
          )}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground/70">{count}</span>
      </button>
      {open && <ul className="divide-y divide-border" role="list">{children}</ul>}
    </section>
  );
}
