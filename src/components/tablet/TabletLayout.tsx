import { ReactNode, useState } from 'react';
import { Menu, Users } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TabletLayoutProps {
  /** Compact server rail (always visible on the left) */
  serverRail: ReactNode;
  /** Channel list — rendered inside a left Sheet drawer */
  channelList?: ReactNode;
  /** Main content area (chat / voice / specialized channel) */
  main: ReactNode;
  /** Member list — rendered inside a right Sheet drawer */
  memberList?: ReactNode;
  /** Whether to show the channel-list toggle button (hidden on home/DM) */
  showChannelToggle?: boolean;
  /** Whether to show the members toggle button */
  showMembersToggle?: boolean;
}

/**
 * Hybrid layout for tablet-sized screens (768–1023px).
 *  - 64px compact server rail always visible
 *  - ChannelList collapsed into a left Sheet drawer
 *  - MemberList collapsed into a right Sheet drawer
 *  - Main content takes the remaining width
 */
export function TabletLayout({
  serverRail,
  channelList,
  main,
  memberList,
  showChannelToggle = true,
  showMembersToggle = true,
}: TabletLayoutProps) {
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  return (
    <div className="h-[100svh] flex bg-[hsl(var(--sidebar-background))] overflow-hidden">
      {/* Compact server rail (64px) */}
      <div className="w-[64px] shrink-0 h-full overflow-hidden">
        <div className="h-full [&>div]:!w-[64px]">{serverRail}</div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Floating top action buttons */}
        <div
          className={cn(
            'absolute top-2 z-30 flex gap-1 pointer-events-none',
            'left-2',
          )}
        >
          {showChannelToggle && channelList && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChannelsOpen(true)}
              className="h-9 w-9 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm pointer-events-auto"
              aria-label="Ouvrir les salons"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div
          className={cn(
            'absolute top-2 z-30 flex gap-1 pointer-events-none',
            'right-2',
          )}
        >
          {showMembersToggle && memberList && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMembersOpen(true)}
              className="h-9 w-9 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm pointer-events-auto"
              aria-label="Ouvrir les membres"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">{main}</div>
      </div>

      {/* Channel list drawer */}
      {channelList && (
        <Sheet open={channelsOpen} onOpenChange={setChannelsOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:max-w-[280px] border-r">
            <div className="h-full overflow-hidden" onClick={() => setChannelsOpen(false)}>
              <div onClick={(e) => e.stopPropagation()} className="h-full">
                {channelList}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Member list drawer */}
      {memberList && (
        <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
          <SheetContent side="right" className="p-0 w-[280px] sm:max-w-[280px] border-l">
            <div className="h-full overflow-hidden">{memberList}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
