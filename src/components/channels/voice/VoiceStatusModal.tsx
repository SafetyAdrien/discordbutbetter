import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from '@/components/icons/discord/lucide';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';

/*
 * "Quel est le sujet de la discussion ?" (video de reference) : bandeau violet, theiere,
 * titre, champ "Statut de <salon>" avec emoji, Annuler / Definir le statut.
 */
interface Props {
  channelName: string;
  serverId: string | null;
  initial: string;
  onClose: () => void;
  onSave: (status: string) => void;
}

export function VoiceStatusModal({ channelName, serverId, initial, onClose, onSave }: Props) {
  const [value, setValue] = useState(initial);
  const save = () => { onSave(value.trim()); onClose(); };
  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-75" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[100] w-[500px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[hsl(var(--input))] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-100"
        >
          <div className="h-[200px] flex items-end justify-center bg-gradient-to-b from-[#5b3d9f] via-[#3a2f66] to-[hsl(var(--input))]">
            <svg width="300" height="130" viewBox="0 0 300 130" aria-hidden className="mb-2">
              <ellipse cx="170" cy="118" rx="95" ry="9" fill="#0b0716" opacity=".55" />
              <path d="M70 52c-30-22-34 12-8 30l8-8c-14-8-12-18-2-14z" fill="#8c8cf0" />
              <path d="M70 62c0-24 36-32 62-32s60 10 60 40c0 24-26 44-62 44S70 86 70 62z" fill="#9b9bf5" />
              <ellipse cx="132" cy="36" rx="38" ry="9" fill="#c4c4fb" />
              <rect x="124" y="20" width="16" height="12" rx="4" fill="#2a2a66" />
              <path d="M192 62c18 2 40 0 54-8l6 20c-2 28-20 40-44 40-20 0-32-14-32-30z" fill="#b9b9fa" />
              <ellipse cx="222" cy="52" rx="30" ry="9" fill="#5a3fa8" />
            </svg>
          </div>
          <DialogPrimitive.Close aria-label="Fermer" className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </DialogPrimitive.Close>
          <div className="px-6 pb-6 -mt-2">
            <DialogPrimitive.Title className="text-center text-xl font-semibold text-white">Quel est le sujet de la discussion ?</DialogPrimitive.Title>
            <p className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">Informe les autres de ce que tu fais dans le salon vocal !</p>
            <label htmlFor="voice-status" className="block mt-6 mb-2 text-sm font-semibold text-white">Statut</label>
            <div className="flex items-center h-11 px-3 rounded-lg bg-[hsl(var(--background))]/60 border border-black/10 focus-within:border-primary">
              <input
                id="voice-status"
                autoFocus
                value={value}
                maxLength={500}
                placeholder={`Statut de ${channelName}`}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                className="flex-1 min-w-0 bg-transparent outline-none text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))]"
              />
              <EmojiStickerPicker
                serverId={serverId}
                onEmojiSelect={(emoji) => setValue((v) => v + emoji)}
                trigger={<button type="button" aria-label="Emoji" className="w-6 h-6 text-[hsl(var(--header-icon))] hover:text-white text-lg leading-none">☺</button>}
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg bg-[hsl(var(--button-secondary))] hover:brightness-110 text-sm font-medium text-white transition">Annuler</button>
              <button type="button" onClick={save} className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-sm font-medium text-white transition-colors">Définir le statut</button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
