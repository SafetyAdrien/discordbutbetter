import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfettiCanvas } from '@/components/effects/ConfettiCanvas';
import { useAuth } from '@/contexts/AuthContext';
import { useMyBirthdayStatus, claimMyBirthdayBadge } from '@/hooks/useBirthday';

const GOLDEN_COLORS = [
  'hsl(45, 95%, 58%)',
  'hsl(38, 95%, 60%)',
  'hsl(50, 100%, 65%)',
  'hsl(30, 100%, 55%)',
  'hsl(0, 0%, 100%)',
];

const todayKey = () => {
  const d = new Date();
  return `birthday-celebrated-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function BirthdayLoginCelebration() {
  const { user, profile } = useAuth();
  const { data } = useMyBirthdayStatus();
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (!user || !data?.isBirthday) return;
    const key = todayKey();
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch {
      // ignore
    }

    setConfetti(true);
    const name = profile?.display_name || 'toi';
    toast.success(`🎂 Joyeux anniversaire, ${name} !`, {
      description: 'Profite bien de ta journée — les autres verront ton badge festif.',
      duration: 6000,
    });

    // Claim the yearly badge (idempotent server-side)
    claimMyBirthdayBadge().catch(() => {
      /* silent */
    });
  }, [user?.id, data?.isBirthday, profile?.display_name]);

  if (!confetti) return null;
  return (
    <ConfettiCanvas
      active
      count={140}
      duration={3500}
      colors={GOLDEN_COLORS}
      onComplete={() => setConfetti(false)}
    />
  );
}
