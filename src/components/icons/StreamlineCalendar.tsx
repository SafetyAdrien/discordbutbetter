import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineCalendarProps {
  className?: string;
  size?: number | string;
}

/** Icone "calendar" de la planche des types de salon (ChannelSheetIcon). */
export function StreamlineCalendar({ className, size }: StreamlineCalendarProps) {
  return <ChannelSheetIcon name="calendar" className={className} size={size} />;
}
