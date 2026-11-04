import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { usePickerServers } from '@/hooks/useAllServerAssets';
import type { CustomEmojiRef } from '@/lib/customEmoji';

/*
 * Emoji de serveur dans un message, un sujet de salon, une biographie... (video de reference) : image de 1,375em
 * alignee sur le texte (3rem quand le message ne contient que des emojis) ; au survol / clic, fiche avec l'emoji, son nom
 * et le serveur d'origine.
 */

function EmojiCard({ emoji }: { emoji: CustomEmojiRef }) {
  const { data: servers = [] } = usePickerServers();
  const server = servers.find((s) => s.id === emoji.serverId);
  return (
    <div className="w-[265px] overflow-hidden rounded-lg border border-white/[0.06] bg-[#33333b] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
      <div className="flex gap-3 bg-[#3b3b44] p-3">
        <img src={emoji.url} alt="" draggable={false} className="h-10 w-10 shrink-0 object-contain" />
        <div className="min-w-0">
          <p translate="no" className="truncate text-base font-semibold leading-5 text-white">:{emoji.name}:</p>
          <p className="mt-0.5 text-sm leading-[18px] text-[#dbdee1]">
            {server ? "Cet émoji vient de l'un de tes serveurs. Tape son nom dans la barre de discussion pour l'utiliser." : "Cet émoji vient d'un serveur dont tu n'es pas membre."}
          </p>
        </div>
      </div>
      {server && (
        <div className="p-3">
          <p className="text-sm leading-[18px] text-[#b5bac1]">Cet émoji vient de</p>
          <div className="mt-2 flex items-center gap-3">
            {server.icon_url ? (
              <img src={server.icon_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-xs font-semibold text-white">{server.name.slice(0, 2).toUpperCase()}</span>
            )}
            <div className="min-w-0">
              <p translate="no" className="truncate text-base font-semibold leading-5 text-white">{server.name}</p>
              <p className="text-xs leading-4 text-[#b5bac1]">{server.is_public ? 'Serveur public' : 'Serveur accessible uniquement sur invitation'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomEmoji({ emoji, jumbo }: { emoji: CustomEmojiRef; jumbo?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <img
          src={emoji.url}
          alt={`:${emoji.name}:`}
          title={undefined}
          draggable={false}
          loading="lazy"
          decoding="async"
          data-custom-emoji={emoji.name}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className={cn('inline-block cursor-pointer select-none object-contain align-bottom', jumbo ? 'h-[3rem] w-auto min-w-[3rem]' : 'h-[1.375em] w-auto min-w-[1.375em]')}
          style={{ margin: jumbo ? '0 0.05em' : '0 0.05em' }}
        />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content side="top" align="start" sideOffset={6} collisionPadding={12} onOpenAutoFocus={(e) => e.preventDefault()} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} className="z-[140] outline-none">
          <EmojiCard emoji={emoji} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
