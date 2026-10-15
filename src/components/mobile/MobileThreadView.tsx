import { lazy, Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';

const ThreadView = lazy(() => import('@/components/threads/ThreadView'));

interface MobileThreadViewProps {
  threadId: string;
  channelId?: string;
  serverId: string | null;
  channelName: string;
  onBack: () => void;
}

export function MobileThreadView({ threadId, channelId, serverId, channelName, onBack }: MobileThreadViewProps) {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<Spinner />}>
        <ThreadView
          threadId={threadId}
          channelId={channelId}
          serverId={serverId}
          channelName={channelName}
          onBack={onBack}
        />
      </Suspense>
    </div>
  );
}
