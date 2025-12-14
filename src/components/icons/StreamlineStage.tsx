import { cn } from '@/lib/utils';

interface StreamlineStageProps {
  className?: string;
}

export function StreamlineStage({ className }: StreamlineStageProps) {
  return (
    <svg
      className={cn('w-4 h-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stage/podium shape */}
      <path
        d="M12 2L3 7v2l9 5 9-5V7l-9-5z"
        fill="currentColor"
        opacity="0.3"
      />
      <path
        d="M3 9v6l9 5 9-5V9l-9 5-9-5z"
        fill="currentColor"
      />
      {/* Speaker icon in center */}
      <circle
        cx="12"
        cy="10"
        r="2.5"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
}
