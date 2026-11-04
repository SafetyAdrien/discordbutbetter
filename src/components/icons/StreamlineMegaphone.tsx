import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineMegaphoneProps {
  className?: string;
  size?: number | string;
}

/** Icone "announcement" de la planche des types de salon (ChannelSheetIcon). */
export const StreamlineMegaphone = ({ className, size }: StreamlineMegaphoneProps) => (
  <ChannelSheetIcon name="announcement" className={className} size={size} />
);
