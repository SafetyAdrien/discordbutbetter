import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileScreenProps {
  id: string;
  children: ReactNode;
}

interface MobileNavigationStackProps {
  screens: MobileScreenProps[];
}

export function MobileNavigationStack({ screens }: MobileNavigationStackProps) {
  const current = screens[screens.length - 1];
  if (!current) return null;

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={current.id}
        initial={{ x: '100%', opacity: 0.8 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-30%', opacity: 0.5 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="absolute inset-0 bg-background"
      >
        {current.children}
      </motion.div>
    </AnimatePresence>
  );
}
