import { useMemo } from 'react';
import { AdaptiveSheet } from '@/components/ui/adaptive-sheet';
import { useDMMessages } from '@/hooks/useDMMessages';
import { ImageOff } from 'lucide-react';

interface Props {
  conversationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileDMMediaGallery({ conversationId, open, onOpenChange }: Props) {
  const { data: messages = [] } = useDMMessages(open ? conversationId : null);

  const media = useMemo(() => {
    const items: { id: string; url: string; type: string; name: string }[] = [];
    messages.forEach((m) => {
      m.attachments.forEach((a) => {
        if (a.type === 'image' || a.type === 'video') {
          items.push({ id: a.id, url: a.url, type: a.type, name: a.name });
        }
      });
    });
    return items.reverse();
  }, [messages]);

  return (
    <AdaptiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Médias partagés"
      description={`${media.length} ${media.length > 1 ? 'éléments' : 'élément'}`}
      mobileVariant="fullscreen"
      contentClassName="p-4"
    >
      {media.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageOff className="w-10 h-10 mb-2 opacity-60" />
          <p className="text-sm">Aucun média partagé pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {media.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.name}
              className="relative block aspect-square overflow-hidden rounded-xl bg-[hsl(var(--surface-2))] active:opacity-80"
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video src={item.url} className="w-full h-full object-cover" muted />
              )}
            </a>
          ))}
        </div>
      )}
    </AdaptiveSheet>
  );
}
