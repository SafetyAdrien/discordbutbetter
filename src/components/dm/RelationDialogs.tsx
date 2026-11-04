import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@/components/icons/discord/lucide';
import { useRelations } from '@/hooks/useRelations';
import { useRemoveFriend } from '@/hooks/useFriends';

/*
 * Fenetres de la relation avec un ami (video de reference) : "Retirer 'x'" (confirmation) et "Ajouter / Modifier un
 * pseudo d'ami" (visible par toi seul, dans les messages prives).
 */

const OVERLAY = 'fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-100';
const CONTENT = 'fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 max-w-[calc(100vw-32px)] rounded-lg bg-[#383840] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] duration-100';
const CLOSE = 'absolute top-[15px] right-[15px] flex h-6 w-6 items-center justify-center text-[hsl(var(--icon-default))] hover:text-white';
const SECONDARY = 'h-[38px] rounded-[4px] bg-white/[0.08] text-base font-medium text-white transition-colors hover:bg-white/[0.12]';

interface RemoveFriendProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  friendshipId: string | null;
  username: string;
}

export function RemoveFriendDialog({ open, onOpenChange, friendshipId, username }: RemoveFriendProps) {
  const removeFriend = useRemoveFriend();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content aria-describedby={undefined} className={`${CONTENT} w-[385px] p-[22px]`}>
          <DialogPrimitive.Title translate="no" className="text-xl leading-6 font-semibold text-white">Retirer '{username}'</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className={CLOSE}>
            <X className="h-[14px] w-[14px]" />
          </DialogPrimitive.Close>
          <p className="mt-1.5 text-base leading-5 text-[#dbdee1]">
            Veux-tu vraiment supprimer <span translate="no" className="font-semibold text-white">{username}</span> de tes amis ?
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className={SECONDARY}>Annuler</button>
            <button
              type="button"
              onClick={() => {
                if (friendshipId) removeFriend.mutate(friendshipId);
                onOpenChange(false);
              }}
              className="h-[38px] rounded-[4px] bg-[#da373c] text-base font-medium text-white transition-colors hover:bg-[#a12d2f]"
            >
              Retirer l'ami
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface NicknameProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  /** Nom d'affichage (placeholder du champ). */
  displayName: string;
}

export function FriendNicknameDialog({ open, onOpenChange, userId, displayName }: NicknameProps) {
  const { nicknameOf, setNickname } = useRelations();
  const current = nicknameOf(userId);
  const [value, setValue] = useState('');
  useEffect(() => {
    if (open) setValue(current ?? '');
  }, [open, current]);

  const save = () => {
    setNickname(userId, value);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content aria-describedby={undefined} className={`${CONTENT} w-[464px] p-6`}>
          <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white">{current ? "Modifier un pseudo d'ami" : "Ajouter un pseudo d'ami"}</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Fermer" className={CLOSE}>
            <X className="h-[14px] w-[14px]" />
          </DialogPrimitive.Close>
          <p className="mt-2 text-base leading-5 text-[#dbdee1]">
            Trouver un ami est plus facile s'il dispose d'un pseudo personnel. Il ne sera visible que par toi dans les messages privés.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label htmlFor="friend-nickname" className="mt-5 block text-sm font-medium leading-4 text-white">Pseudo d'ami</label>
            <input
              id="friend-nickname"
              autoFocus
              value={value}
              maxLength={32}
              onChange={(e) => setValue(e.target.value)}
              placeholder={displayName}
              translate="no"
              className="mt-2 h-10 w-full rounded-[4px] border-0 bg-[#2b2b33] px-2.5 text-base text-white outline-none placeholder:text-[#8e9097] focus:shadow-[inset_0_0_0_2px_#5b63e4]"
            />
            <button type="button" onClick={() => setValue('')} className="mt-2 text-sm leading-4 text-[#00a8fc] hover:underline">Réinitialiser le pseudo d'ami</button>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onOpenChange(false)} className={SECONDARY}>Annuler</button>
              <button type="submit" className="h-[38px] rounded-[4px] bg-[#5865f2] text-base font-medium text-white transition-colors hover:bg-[#4752c4]">Enregistrer</button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
