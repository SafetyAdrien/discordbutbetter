import { InboxPanel } from '@/components/inbox/InboxPanel';

export function MobileNotificationsView() {
  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 flex items-center border-b border-border/30 bg-card">
        <h2 className="font-semibold text-sm">Notifications</h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <InboxPanel />
      </div>
    </div>
  );
}
