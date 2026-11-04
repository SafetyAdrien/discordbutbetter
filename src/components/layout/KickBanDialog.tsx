import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@/components/icons/discord/lucide';
import { useBanMember, useKickMember } from '@/hooks/useMemberActions';

/* Confirmation "Expulser x" / "Bannir x" depuis le menu d'un membre (raison facultative pour un bannissement). */
interface Props {
  target: { id: string; name: string } | null;
  mode: 'kick' | 'ban';
  serverId: string;
  onClose: () => void;
}

export function KickBanDialog({ target, mode, serverId, onClose }: Props) {
  const kick = useKickMember();
  const ban = useBanMember();
  const [reason, setReason] = useState('');
  useEffect(() => setReason(''), [target?.id, mode]);
  const verb = mode === 'kick' ? 'Expulser' : 'Bannir';

  const confirm = () => {
    if (!target) return;
    const done = { onSuccess: onClose };
    if (mode === 'kick') kick.mutate({ serverId, userId: target.id }, done);
    else ban.mutate({ serverId, userId: target.id, reason: reason.trim() || undefined }, done);
  };

  return (
    <DialogPrimitive.Root open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 duration-100" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[130] w-[385px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/[0.08] bg-[#383840] p-[22px] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-100"
        >
          <DialogPrimitive.Title translate="no" className="text-xl font-semibold leading-6 text-white">{verb} {target?.name}</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className="absolute right-[15px] top-[15px] flex h-6 w-6 items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
            <X className="h-[14px] w-[14px]" />
          </DialogPrimitive.Close>
          <p className="mt-1.5 text-base leading-5 text-[#dbdee1]">
            {mode === 'kick' ? <>Veux-tu vraiment expulser <span translate="no" className="font-semibold text-white">{target?.name}</span> du serveur ? Il pourra le rejoindre avec une nouvelle invitation.</> : <>Veux-tu vraiment bannir <span translate="no" className="font-semibold text-white">{target?.name}</span> du serveur ? Il ne pourra plus le rejoindre.</>}
          </p>
          {mode === 'ban' && (
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Raison du bannissement (facultatif)" maxLength={200} className="mt-4 h-10 w-full rounded-[4px] bg-[#2b2b33] px-2.5 text-base text-white outline-none placeholder:text-[#8e9097] focus:shadow-[inset_0_0_0_2px_#5b63e4]" />
          )}
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={onClose} className="h-[38px] rounded-[4px] bg-white/[0.08] text-base font-medium text-white transition-colors hover:bg-white/[0.12]">Annuler</button>
            <button type="button" onClick={confirm} className="h-[38px] rounded-[4px] bg-[#da373c] text-base font-medium text-white transition-colors hover:bg-[#a12d2f]">{verb}</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
