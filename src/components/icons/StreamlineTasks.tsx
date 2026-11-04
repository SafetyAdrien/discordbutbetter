import { ChannelSheetIcon } from './ChannelSheetIcon';

interface StreamlineTasksProps {
  className?: string;
  size?: number | string;
}

/** Icone "tasks" de la planche des types de salon (ChannelSheetIcon). */
export function StreamlineTasks({ className, size }: StreamlineTasksProps) {
  return <ChannelSheetIcon name="tasks" className={className} size={size} />;
}
