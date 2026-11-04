import { EventsModal } from "@/components/events/EventsModal";

/*
 * "Creer un evenement" depuis un salon de conference : l'assistant des
 * evenements de serveur, avec ce salon preselectionne comme emplacement.
 */

interface StageEventWizardProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  stageChannel: { id: string; name: string };
}

export function StageEventWizard({ open, onClose, serverId, stageChannel }: StageEventWizardProps) {
  return (
    <EventsModal
      serverId={serverId}
      open={open}
      onClose={onClose}
      startWithWizard
      preset={{ type: "stage", channelId: stageChannel.id }}
    />
  );
}
