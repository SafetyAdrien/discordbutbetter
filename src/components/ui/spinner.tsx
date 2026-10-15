import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center w-full h-full py-8">
      <Loader2 className={cn('w-6 h-6 animate-spin text-muted-foreground', className)} />
    </div>
  );
}
