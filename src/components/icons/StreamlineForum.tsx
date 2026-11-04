import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineForumProps {
  className?: string;
  size?: number | string;
}

/** Icone "forum" de la planche des types de salon (ChannelSheetIcon). */
export function StreamlineForum({ className, size }: StreamlineForumProps) {
  return <ChannelSheetIcon name="forum" className={className} size={size} />;
}
