import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineHashProps {
  className?: string;
  size?: number | string;
}

/** Icone "text" de la planche des types de salon (ChannelSheetIcon). */
export function StreamlineHash({ className, size }: StreamlineHashProps) {
  return <ChannelSheetIcon name="text" className={className} size={size} />;
}
