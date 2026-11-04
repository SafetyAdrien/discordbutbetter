import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { Check } from '@/components/icons/discord/lucide';

/*
 * Autocollant dans un message (video de reference) : infobulle "nom / Clique pour en savoir plus", puis au clic une
 * fiche : vignette + nom + explication, puis "Cet autocollant vient de" avec le serveur (icone, nom, membres en ligne,
 * mode Decouverte).
 */

function useOrigin(url: string, enabled: boolean) {
  const assets = useAllServerAssets(enabled);
  const sticker = assets.stickers.find((s) => s.url === url);
  const server = sticker ? assets.servers.find((sv) => sv.id === sticker.server_id) : undefined;
  const info = useQuery({
    queryKey: ['sticker-origin', server?.id],
    enabled: enabled && !!server,
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: s }, { data: members }] = await Promise.all([
        supabase.from('servers').select('is_public').eq('id', server!.id).maybeSingle(),
        supabase.from('server_members').select('user:profiles(status, manual_status)').eq('server_id', server!.id).limit(1000),
      ]);
      const online = ((members ?? []) as { user: { status: string | null; manual_status: string | null } | null }[]).filter((m) => {
        const st = m.user?.manual_status ?? m.user?.status;
        return st === 'online' || st === 'idle' || st === 'dnd';
      }).length;
      return { isPublic: !!s?.is_public, online };
    },
  });
  return { sticker, server, info: info.data };
}

function Card({ url, name }: { url: string; name: string }) {
  const { server, info } = useOrigin(url, true);
  return (
    <div className="overflow-hidden rounded-lg bg-[#2f2f37] shadow-[0_8px_16px_rgba(0,0,0,0.24)] ring-1 ring-white/[0.06]">
      <div className="flex gap-3 bg-[#3e3e47] p-4">
        <img src={url} alt="" draggable={false} className="h-[60px] w-[60px] shrink-0 object-contain" />
        <div className="min-w-0">
          <p translate="no" className="text-[16px] font-semibold leading-5 text-white">{name}</p>
          <p className="text-[14px] leading-[18px] text-[#dbdee1]">
            Cet autocollant vient de l’un de tes serveurs. Tape son nom dans la barre de discussion pour l’utiliser.
          </p>
        </div>
      </div>
      {server && (
        <div className="p-4">
          <p className="mb-3 text-[14px] leading-[18px] text-[#b5bac1]">Cet autocollant vient de</p>
          <div className="flex items-center gap-3">
            {server.icon_url ? (
              <img src={server.icon_url} alt="" className="h-10 w-10 shrink-0 rounded-[10px] object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#5865f2] text-[14px] font-semibold text-white">{server.name.slice(0, 2).toUpperCase()}</span>
            )}
            <div className="min-w-0">
              <p translate="no" className="flex items-center gap-1 text-[16px] font-semibold leading-5 text-white">
                {info?.isPublic && (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#5865f2] text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
                <span className="truncate">{server.name}</span>
              </p>
              <p className="flex gap-4 text-[12px] leading-4 text-[#b5bac1]">
                {info && <span>{info.online.toLocaleString('fr-FR')} en ligne</span>}
                {info?.isPublic && <span>Serveur en mode Découverte</span>}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StickerInfoPopover({ url, name, children }: { url: string; name: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>{children}</PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" arrow={false} className="px-3 py-2">
          <p translate="no" className="text-[14px] font-semibold leading-[18px] text-white">{name}</p>
          <p className="text-[12px] font-normal leading-4 text-[#b5bac1]">Clique pour en savoir plus</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="start" sideOffset={8} className="w-[280px] border-0 bg-transparent p-0 shadow-none">
        <Card url={url} name={name} />
      </PopoverContent>
    </Popover>
  );
}
