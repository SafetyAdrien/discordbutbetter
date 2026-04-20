import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface MobileScreenProps {
  id: string;
  children: ReactNode;
}

interface MobileNavigationStackProps {
  screens: MobileScreenProps[];
}

export function MobileNavigationStack({ screens }: MobileNavigationStackProps) {
  const current = screens[screens.length - 1];
  const reduced = useReducedMotion();
  if (!current) return null;

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={current.id}
        initial={reduced ? { opacity: 1 } : { x: '100%', opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={reduced ? { opacity: 1 } : { x: '-30%', opacity: 0.5 }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
        className="absolute inset-0 bg-background"
      >
        {current.children}
      </motion.div>
    </AnimatePresence>
  );
}
