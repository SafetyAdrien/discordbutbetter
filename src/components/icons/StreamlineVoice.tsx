import { cn } from '@/lib/utils';

interface StreamlineVoiceProps {
  className?: string;
  size?: number;
}

export function StreamlineVoice({ className, size = 24 }: StreamlineVoiceProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
    >
      <path 
        fill="currentColor" 
        fillRule="evenodd" 
        d="M11.38 3.08a1 1 0 0 1 .62.92v16a1 1 0 0 1-1.65.76L5.7 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2.7l4.65-3.76a1 1 0 0 1 1.03-.16ZM15.54 7.46a1 1 0 0 1 1.41 0 6.5 6.5 0 0 1 0 9.19 1 1 0 0 1-1.41-1.42 4.5 4.5 0 0 0 0-6.36 1 1 0 0 1 0-1.41Zm3.53-3.53a1 1 0 0 1 1.41 0c4.69 4.69 4.69 12.3 0 16.98a1 1 0 0 1-1.41-1.41 10 10 0 0 0 0-14.16 1 1 0 0 1 0-1.41Z" 
        clipRule="evenodd"
      />
    </svg>
  );
}
