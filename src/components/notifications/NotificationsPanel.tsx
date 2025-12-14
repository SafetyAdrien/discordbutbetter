import { Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationsPanel() {
  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-border bg-card">
        <Bell className="w-5 h-5 mr-2 text-muted-foreground" />
        <h2 className="font-semibold">Notifications</h2>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">Aucune notification</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Vous n'avez pas de nouvelles notifications pour le moment.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
