import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineStageProps {
  className?: string;
  size?: number | string;
}

/** Icone "stage" de la planche des types de salon (ChannelSheetIcon). */
export function StreamlineStage({ className, size }: StreamlineStageProps) {
  return <ChannelSheetIcon name="stage" className={className} size={size} />;
}
