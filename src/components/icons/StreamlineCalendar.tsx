import { cn } from '@/lib/utils';

interface StreamlineCalendarProps {
  className?: string;
  size?: number;
}

export function StreamlineCalendar({ className, size = 24 }: StreamlineCalendarProps) {
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
        d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1ZM5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9H5Zm9 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" 
        clipRule="evenodd"
      />
    </svg>
  );
}
