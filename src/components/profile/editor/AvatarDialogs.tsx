import { useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, X } from '@/components/icons/discord/lucide';
import { ImagePlus, Loader2 } from 'lucide-react';
import { GifPanel } from '@/components/chat/emoji-picker/GifPanel';
import { useFavorites } from '@/components/chat/emoji-picker/useFavorites';
import { useGifSearch } from '@/components/chat/emoji-picker/useGifSearch';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/*
 * Fenetres de l'avatar (video de reference) : "Sélectionne une image" (importer / GIF /
 * avatar actuel) et la confirmation "Supprimer l'avatar" avec son astuce (Maj pour
 * passer la confirmation). Les decorations et l'animation Nitro n'existent pas ici.
 */

const OVERLAY = 'fixed inset-0 z-[120] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-100';
const CONTENT = 'fixed left-1/2 top-1/2 z-[130] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[hsl(var(--input))] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-100 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.92] data-[state=closed]:duration-150';

function CloseButton() {
  return (
    <DialogPrimitive.Close aria-label="Fermer" className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white transition-colors">
      <X className="w-5 h-5" />
    </DialogPrimitive.Close>
  );
}

interface SelectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarUrl: string | null;
  displayName: string;
  userId: string;
  uploading?: boolean;
  /** Fichier choisi : l'appelant ouvre l'editeur de recadrage. */
  onFile: (file: File) => void;
  /** GIF choisi : envoye tel quel (un recadrage ferait perdre l'animation). */
  onGif: (file: File) => void;
}

export function SelectImageModal({ open, onOpenChange, avatarUrl, displayName, userId, uploading, onFile, onGif }: SelectProps) {
  const input = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<'home' | 'gif'>('home');
  const [busy, setBusy] = useState(false);
  const { favorites, isFavorite, toggle } = useFavorites();
  const { data: trending = [] } = useGifSearch('');
  const mosaic = trending.slice(0, 4);

  const pickGif = async (url: string, name: string) => {
    setBusy(true);
    try {
      const blob = await (await fetch(url)).blob();
      const ext = blob.type.split('/')[1] || 'gif';
      onGif(new File([blob], `avatar-${Date.now()}.${ext}`, { type: blob.type || 'image/gif' }));
      onOpenChange(false);
    } catch {
      toast.error(`Impossible de récupérer « ${name} »`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setView('home'); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content aria-describedby={undefined} className={cn(CONTENT, 'w-[440px] max-w-[calc(100vw-32px)] p-4')}>
          <div className="flex items-center gap-2 pl-1 pt-1">
            {view === 'gif' && (
              <button type="button" aria-label="Retour" onClick={() => setView('home')} className="w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white">Sélectionne une image</DialogPrimitive.Title>
          </div>
          <CloseButton />

          {view === 'home' ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => input.current?.click()}
                  className="h-[154px] rounded-lg bg-white/[0.05] hover:bg-white/[0.09] transition-colors flex flex-col items-center justify-center gap-2 text-sm font-semibold text-white"
                >
                  <ImagePlus className="w-6 h-6" />
                  Importer une image
                </button>
                <button
                  type="button"
                  onClick={() => setView('gif')}
                  className="relative h-[154px] rounded-lg overflow-hidden bg-black text-sm font-semibold text-white"
                >
                  {mosaic.length > 0 && (
                    <span className="absolute inset-0 grid grid-cols-2 opacity-70">
                      {mosaic.map((g) => (
                        <img key={g.id} src={g.previewUrl} alt="" className="w-full h-full object-cover" />
                      ))}
                    </span>
                  )}
                  <span className="relative h-full flex flex-col items-center justify-center gap-2 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
                    <span className="px-1 rounded-[3px] bg-white text-black text-[10px] font-extrabold leading-4">GIF</span>
                    Choisir un GIF
                  </span>
                </button>
              </div>
              <input
                ref={input}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) {
                    onOpenChange(false);
                    onFile(f);
                  }
                }}
              />

              <h3 className="mt-6 text-base font-semibold text-white pl-1">Avatar actuel</h3>
              <p className="mt-1 pl-1 text-sm text-muted-foreground">Ton avatar est mis à jour dès qu'une nouvelle image est choisie.</p>
              <div className="mt-3 pl-1 pb-2">
                <span className="inline-flex rounded-full ring-2 ring-primary ring-offset-2 ring-offset-[hsl(var(--input))]">
                  <UserAvatarImage
                    src={avatarUrl}
                    alt={displayName}
                    className="w-[66px] h-[66px]"
                    fallbackClassName="bg-primary/20 text-primary text-2xl font-semibold"
                    fallback={(displayName || '?').charAt(0).toUpperCase()}
                    ownerId={userId}
                  />
                </span>
              </div>
            </>
          ) : (
            <div className="mt-4 h-[440px] relative">
              <GifPanel favorites={favorites} isFavorite={isFavorite} onToggleFavorite={toggle} onPick={(url, name) => void pickGif(url, name)} />
              {(busy || uploading) && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

interface RemoveProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avatarUrl: string | null;
  displayName: string;
  userId: string;
  kind?: 'avatar' | 'banner';
  onConfirm: () => void;
}

export function RemoveImageDialog({ open, onOpenChange, avatarUrl, displayName, userId, kind = 'avatar', onConfirm }: RemoveProps) {
  const isAvatar = kind === 'avatar';
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={OVERLAY} />
        <DialogPrimitive.Content aria-describedby={undefined} className={cn(CONTENT, 'w-[480px] max-w-[calc(100vw-32px)] p-7')}>
          <DialogPrimitive.Title className="text-xl leading-6 font-semibold text-white">
            {isAvatar ? "Supprimer l'avatar" : 'Supprimer la bannière'}
          </DialogPrimitive.Title>
          <CloseButton />
          <p className="mt-3 text-base text-[hsl(var(--text-normal,var(--foreground)))]">
            {isAvatar ? 'Es-tu sûr de vouloir supprimer cet avatar ?' : 'Es-tu sûr de vouloir supprimer cette bannière ?'}
          </p>
          {isAvatar && (
            <div className="mt-5 flex justify-center">
              <UserAvatarImage
                src={avatarUrl}
                alt={displayName}
                className="w-[144px] h-[144px]"
                fallbackClassName="bg-primary/20 text-primary text-5xl font-semibold"
                fallback={(displayName || '?').charAt(0).toUpperCase()}
                ownerId={userId}
              />
            </div>
          )}
          <p className="mt-5 text-sm font-bold text-[#23a55a]">Astuce :</p>
          <p className="text-xs leading-4 text-muted-foreground">
            Tu peux maintenir Maj en {isAvatar ? "supprimant un avatar" : 'supprimant une bannière'} pour passer complètement cette confirmation.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-[46px] rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-base font-medium text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className="h-[46px] rounded-lg bg-[#da373c] hover:bg-[#a12d2f] text-base font-medium text-white transition-colors"
            >
              {isAvatar ? "Supprimer l'avatar" : 'Supprimer la bannière'}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
