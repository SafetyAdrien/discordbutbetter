import { cn } from '@/lib/utils';

interface StreamlineLinkProps {
  className?: string;
  size?: number;
}

export function StreamlineLink({ className, size = 20 }: StreamlineLinkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <path
        d="M8.5 11.5a3.5 3.5 0 0 0 5 0l3-3a3.536 3.536 0 0 0-5-5l-.5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 8.5a3.5 3.5 0 0 0-5 0l-3 3a3.536 3.536 0 0 0 5 5l.5-.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
