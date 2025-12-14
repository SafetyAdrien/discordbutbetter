import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useServerEmojis, useServerStickers } from '@/hooks/useServerAssets';
import { EMOJI_CATEGORIES } from '@/data/emojis';
import { Search, Smile, Sticker } from 'lucide-react';

interface EmojiStickerPickerProps {
  serverId: string | null;
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect?: (stickerUrl: string, stickerName: string) => void;
  trigger: React.ReactNode;
  defaultTab?: 'emoji' | 'sticker';
}

export function EmojiStickerPicker({
  serverId,
  onEmojiSelect,
  onStickerSelect,
  trigger,
  defaultTab = 'emoji'
}: EmojiStickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: serverEmojis = [] } = useServerEmojis(serverId);
  const { data: serverStickers = [] } = useServerStickers(serverId);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  const handleStickerClick = (stickerUrl: string, stickerName: string) => {
    if (onStickerSelect) {
      onStickerSelect(stickerUrl, stickerName);
    }
    setOpen(false);
  };

  const filteredCategories = EMOJI_CATEGORIES.map(category => ({
    ...category,
    emojis: search
      ? category.emojis.filter(() => true) // In a real app, filter by emoji name
      : category.emojis
  }));

  const filteredServerEmojis = serverEmojis.filter(emoji =>
    !search || emoji.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStickers = serverStickers.filter(sticker =>
    !search || sticker.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="end" 
        className="w-[352px] p-0 bg-[#2b2d31] border-none shadow-xl"
      >
        <Tabs defaultValue={defaultTab} className="w-full">
          <div className="flex items-center border-b border-white/10 px-2">
            <TabsList className="bg-transparent h-10 p-0 gap-1">
              <TabsTrigger 
                value="emoji" 
                className="data-[state=active]:bg-white/10 rounded px-3 py-1.5 gap-1.5"
              >
                <Smile className="w-4 h-4" />
                Emojis
              </TabsTrigger>
              <TabsTrigger 
                value="sticker" 
                className="data-[state=active]:bg-white/10 rounded px-3 py-1.5 gap-1.5"
              >
                <Sticker className="w-4 h-4" />
                Autocollants
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="pl-8 bg-[#1e1f22] border-none h-8 text-sm"
              />
            </div>
          </div>

          <TabsContent value="emoji" className="m-0">
            <ScrollArea className="h-[280px]">
              <div className="px-2 pb-2 space-y-3">
                {/* Server Emojis */}
                {filteredServerEmojis.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase px-1 mb-2">
                      Emojis du serveur
                    </h4>
                    <div className="grid grid-cols-8 gap-0.5">
                      {filteredServerEmojis.map((emoji) => (
                        <button
                          key={emoji.id}
                          onClick={() => handleEmojiClick(`:${emoji.name}:`)}
                          className="w-9 h-9 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                          title={`:${emoji.name}:`}
                        >
                          <img 
                            src={emoji.image_url}
                            alt={emoji.name} 
                            className="w-6 h-6 object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Standard Emoji Categories */}
                {filteredCategories.map((category) => (
                  <div key={category.name}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase px-1 mb-2">
                      {category.name}
                    </h4>
                    <div className="grid grid-cols-8 gap-0.5">
                      {category.emojis.slice(0, search ? 24 : undefined).map((emoji, idx) => (
                        <button
                          key={`${category.name}-${idx}`}
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-9 h-9 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="sticker" className="m-0">
            <ScrollArea className="h-[280px]">
              <div className="px-2 pb-2">
                {filteredStickers.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {filteredStickers.map((sticker) => (
                      <button
                        key={sticker.id}
                        onClick={() => handleStickerClick(sticker.image_url, sticker.name)}
                        className="aspect-square rounded-lg hover:bg-white/10 transition-colors p-2 flex items-center justify-center"
                        title={sticker.name}
                      >
                        <img 
                          src={sticker.image_url} 
                          alt={sticker.name} 
                          className="max-w-full max-h-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center text-muted-foreground">
                    <Sticker className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">Aucun autocollant disponible</p>
                    <p className="text-xs mt-1">
                      Les administrateurs peuvent ajouter des autocollants dans les paramètres du serveur
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
