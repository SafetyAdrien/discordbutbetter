import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { haptics } from '@/lib/haptics';

interface MobileProfileSubpageProps {
  title: string;
  onBack: () => void;
  children: ReactNode;
  rightAction?: ReactNode;
}

/**
 * Reusable wrapper for mobile profile sub-pages.
 * Provides: header with back button, swipe-back gesture, slide-in animation.
 */
export function MobileProfileSubpage({ title, onBack, children, rightAction }: MobileProfileSubpageProps) {
  const reduced = useReducedMotion();
  const swipe = useSwipeBack({
    onBack: () => {
      haptics.light();
      onBack();
    },
  });

  return (
    <motion.div
      initial={reduced ? { opacity: 1 } : { x: '100%' }}
      animate={{ x: 0 }}
      exit={reduced ? { opacity: 1 } : { x: '100%' }}
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
      className="absolute inset-0 z-40 bg-background flex flex-col"
      {...swipe}
    >
      <header className="h-12 px-2 flex items-center gap-1 border-b border-border shrink-0">
        <button
          onClick={() => {
            haptics.light();
            onBack();
          }}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-muted/60"
          aria-label="Retour"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-base flex-1 truncate">{title}</h1>
        {rightAction}
      </header>
      <div className="flex-1 overflow-y-auto pb-8" style={{ overscrollBehavior: 'contain' }}>
        {children}
      </div>
    </motion.div>
  );
}
