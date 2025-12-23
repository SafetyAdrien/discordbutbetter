import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface NewMessageModalProps {
  open: boolean;
  onClose: () => void;
  onSelectDM?: (conversationId: string) => void;
}

export function NewMessageModal({ open, onClose, onSelectDM }: NewMessageModalProps) {
  const [query, setQuery] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const ModalContent = () => (
    <>
      {/* Search Input */}
      <div className="p-4 border-b border-border">
        <Input
          placeholder="Where would you like to go?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="text-base border-none bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
          autoFocus
        />
      </div>

      <ScrollArea className="max-h-80">
        <div className="p-2">
          {/* Previous Channels Section */}
          <div className="mb-4">
            <p className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Previous Channels
            </p>
            <div className="space-y-0.5">
              <ChannelItem 
                icon={<Hash className="w-4 h-4 text-muted-foreground" />}
                name="général"
                category="SALONS TEXTUELS"
              />
              <ChannelItem 
                icon={<Hash className="w-4 h-4 text-muted-foreground" />}
                name="discussions"
                category="COMMUNAUTÉ"
              />
            </div>
          </div>

          {/* Drafts Section */}
          <div className="mb-4">
            <p className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Drafts
            </p>
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              No drafts
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Protip Footer */}
      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-medium">PROTIP:</span>{' '}
          Start searches with{' '}
          <code className="px-1 py-0.5 bg-muted rounded text-foreground">@</code>{' '}
          <code className="px-1 py-0.5 bg-muted rounded text-foreground">#</code>{' '}
          <code className="px-1 py-0.5 bg-muted rounded text-foreground">!</code>{' '}
          <code className="px-1 py-0.5 bg-muted rounded text-foreground">*</code>{' '}
          to narrow results.
        </p>
      </div>
    </>
  );

  // Mobile: use Drawer, Desktop: use Dialog
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose}>
        <DrawerContent className="max-h-[85vh]">
          <ModalContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-border">
          <Input
            placeholder="Where would you like to go?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-base border-none bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-80">
          <div className="p-2">
            {/* Previous Channels Section */}
            <div className="mb-4">
              <p className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Previous Channels
              </p>
              <div className="space-y-0.5">
                <ChannelItem 
                  icon={<Hash className="w-4 h-4 text-muted-foreground" />}
                  name="général"
                  category="SALONS TEXTUELS"
                />
                <ChannelItem 
                  icon={<Hash className="w-4 h-4 text-muted-foreground" />}
                  name="discussions"
                  category="COMMUNAUTÉ"
                />
              </div>
            </div>

            {/* Drafts Section */}
            <div className="mb-4">
              <p className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Drafts
              </p>
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                No drafts
              </div>
            </div>
          </div>
        </ScrollArea>

      </DialogContent>
    </Dialog>
  );
}

function ChannelItem({ 
  icon, 
  name, 
  category 
}: { 
  icon: React.ReactNode;
  name: string;
  category: string;
}) {
  return (
    <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-left">
      {icon}
      <span className="text-sm font-medium">{name}</span>
      <span className="text-xs text-muted-foreground ml-auto">{category}</span>
    </button>
  );
}
