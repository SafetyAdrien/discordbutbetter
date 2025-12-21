import { cn } from '@/lib/utils';

interface StreamlineVoiceLockedProps {
  className?: string;
  size?: number;
}

export function StreamlineVoiceLocked({ className, size = 24 }: StreamlineVoiceLockedProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
    >
      {/* Lock icon - centered padlock */}
      <path 
        fill="currentColor" 
        d="M12 1a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5Zm-3 5a3 3 0 1 1 6 0v2H9V6Zm3 7a1.5 1.5 0 0 1 1 2.62V17a1 1 0 1 1-2 0v-1.38A1.5 1.5 0 0 1 12 13Z"
      />
    </svg>
  );
}
