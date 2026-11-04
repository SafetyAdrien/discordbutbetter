import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineVoiceProps {
  className?: string;
  size?: number | string;
}

/** Icone "voice" de la planche des types de salon (ChannelSheetIcon). */
export function StreamlineVoice({ className, size }: StreamlineVoiceProps) {
  return <ChannelSheetIcon name="voice" className={className} size={size} />;
}
