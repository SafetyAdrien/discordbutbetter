import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineMediaProps {
  className?: string;
  size?: number | string;
}

/** Icone "media" de la planche des types de salon (ChannelSheetIcon). */
export function StreamlineMedia({ className, size }: StreamlineMediaProps) {
  return <ChannelSheetIcon name="media" className={className} size={size} />;
}
