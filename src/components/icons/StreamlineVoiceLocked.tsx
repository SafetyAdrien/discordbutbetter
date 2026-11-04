import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineVoiceLockedProps {
  className?: string;
  size?: number | string;
}

/** Icone "voiceLocked" de la planche des types de salon (ChannelSheetIcon). */
export function StreamlineVoiceLocked({ className, size }: StreamlineVoiceLockedProps) {
  return <ChannelSheetIcon name="voiceLocked" className={className} size={size} />;
}
