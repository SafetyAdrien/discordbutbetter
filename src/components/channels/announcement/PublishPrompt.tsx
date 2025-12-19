import { Megaphone, X } from "lucide-react";
import { usePublishMessage, useDismissPublishPrompt, useChannelFollowers } from "@/hooks/useChannelFollowers";

interface PublishPromptProps {
  messageId: string;
  channelId: string;
  content: string;
  sourceServerId: string;
  sourceServerName: string;
  sourceServerIcon: string | null;
  sourceChannelName: string;
}

export function PublishPrompt({
  messageId,
  channelId,
  content,
  sourceServerId,
  sourceServerName,
  sourceServerIcon,
  sourceChannelName,
}: PublishPromptProps) {
  const publishMessage = usePublishMessage();
  const dismissPrompt = useDismissPublishPrompt();
  const { data: followers = [] } = useChannelFollowers(channelId);

  // Only show if there are followers
  if (followers.length === 0) return null;

  const handlePublish = () => {
    publishMessage.mutate({
      messageId,
      channelId,
      content,
      sourceServerId,
      sourceServerName,
      sourceServerIcon,
      sourceChannelName,
    });
  };

  const handleDismiss = () => {
    dismissPrompt.mutate({ messageId, channelId });
  };

  return (
    <div className="flex items-center gap-2 mt-2 bg-surface-hover rounded-md px-3 py-2 text-sm">
      <Megaphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground">
        Partage ça avec tes abonnés !
      </span>
      <button
        onClick={handlePublish}
        disabled={publishMessage.isPending}
        className="text-primary hover:underline font-medium"
      >
        {publishMessage.isPending ? "Publication..." : "Publier"}
      </button>
      <button
        onClick={handleDismiss}
        className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
        title="Ne plus afficher"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
