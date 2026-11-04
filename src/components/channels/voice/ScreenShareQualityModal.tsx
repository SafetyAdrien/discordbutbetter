import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, ChevronDown, RefreshCw, Settings, X } from '@/components/icons/discord/lucide';
import * as SelectPrimitive from '@radix-ui/react-popover'; // menu deroulant des sources audio
import { toast } from 'sonner';
import { useVoice } from '@/contexts/VoiceContext';
import { cn } from '@/lib/utils';
import type { ScreenShareOptions } from '@/utils/webrtc/MediaManager';

/*
 * "Selecteur de partage d'ecran" (video de reference) : resolution, images par seconde, type de
 * contenu, sources audio, puis "Passer en direct". La source (ecran / fenetre) se choisit ensuite
 * dans le selecteur du systeme, comme pour toute capture d'ecran dans l'application.
 */
const RESOLUTIONS = [480, 720, 1080, 1440, 2160] as const;
const FPS = [15, 30, 60] as const;
const AUDIO = [
  { value: 'none', label: 'Aucune' },
  { value: 'system', label: 'Système entier' },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (options: ScreenShareOptions) => void;
  onOpenAudioSettings?: () => void;
}

function Segmented<T extends number | string>({ items, value, onChange, label }: { items: readonly T[]; value: T; onChange: (v: T) => void; label: (v: T) => string }) {
  return (
    <div className="flex rounded-[4px] overflow-hidden border border-black/30 bg-[hsl(var(--background))]/60">
      {items.map((it, i) => (
        <button
          key={String(it)}
          type="button"
          aria-pressed={value === it}
          onClick={() => onChange(it)}
          className={cn(
            'flex-1 h-8 text-sm font-semibold transition-colors',
            i > 0 && 'border-l border-black/30',
            value === it ? 'bg-primary text-white' : 'text-foreground hover:bg-white/[0.06]',
          )}
        >
          {label(it)}
        </button>
      ))}
    </div>
  );
}

export function ScreenShareQualityModal({ open, onOpenChange, onStart, onOpenAudioSettings }: Props) {
  const { refreshDevices } = useVoice();
  const [height, setHeight] = useState<(typeof RESOLUTIONS)[number]>(1080);
  const [fps, setFps] = useState<(typeof FPS)[number]>(30);
  const [content, setContent] = useState<'smoothness' | 'clarity'>('smoothness');
  const [audio, setAudio] = useState<'none' | 'system'>('none');
  const [audioOpen, setAudioOpen] = useState(false);

  const start = () => {
    onStart({
      quality: height <= 720 ? 'low' : height <= 1080 ? 'medium' : 'high',
      height,
      frameRate: content === 'clarity' ? Math.min(fps, 15) : fps,
      contentType: content,
      audio: audio === 'system',
      cursor: 'always',
    });
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-75" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-[100] w-[540px] max-w-[calc(100vw-32px)] max-h-[calc(100vh-48px)] -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-xl bg-[hsl(var(--input))] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.97] data-[state=open]:duration-100"
        >
          <div className="flex items-center px-5 pt-4 pb-3 shrink-0">
            <DialogPrimitive.Title className="flex-1 text-base font-semibold text-white">Sélecteur de partage d'écran</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Fermer" className="w-6 h-6 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white"><X className="w-5 h-5" /></DialogPrimitive.Close>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 custom-scrollbar">
            <p className="text-sm font-semibold text-white mb-2">Paramètres du stream</p>
            <div className="rounded-lg border border-white/[0.06] bg-black/[0.12] p-3 space-y-3">
              <div className="grid grid-cols-[1.6fr_1fr] gap-4">
                <div>
                  <p className="mb-1.5 text-sm font-medium text-white">Résolution</p>
                  <Segmented items={RESOLUTIONS} value={height} onChange={setHeight} label={String} />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium text-white">Images par seconde</p>
                  <Segmented items={FPS} value={fps} onChange={setFps} label={String} />
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-medium text-white">Type de contenu</p>
                <Segmented<'smoothness' | 'clarity'> items={['smoothness', 'clarity']} value={content} onChange={setContent} label={(v) => (v === 'smoothness' ? 'Privilégier la fluidité' : 'Privilégier la netteté')} />
                <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                  Choisir « Privilégier la netteté » réduira nettement le nombre d'images par seconde, en échange d'une image bien plus nette.
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-sm font-medium text-white">Sources audio</p>
                <SelectPrimitive.Root open={audioOpen} onOpenChange={setAudioOpen}>
                  <SelectPrimitive.Trigger asChild>
                    <button type="button" className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))]/60 border border-black/20 flex items-center text-sm text-white">
                      <span className="flex-1 text-left">{AUDIO.find((a) => a.value === audio)!.label}</span>
                      <ChevronDown className={cn('w-4 h-4 transition-transform', audioOpen && 'rotate-180')} />
                    </button>
                  </SelectPrimitive.Trigger>
                  <SelectPrimitive.Portal>
                    <SelectPrimitive.Content align="start" sideOffset={4} className="z-[120] w-[var(--radix-popover-trigger-width)] p-1 rounded-lg bg-popover border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)] outline-none">
                      {AUDIO.map((a) => (
                        <button key={a.value} type="button" onClick={() => { setAudio(a.value); setAudioOpen(false); }} className="w-full h-9 px-3 rounded-[4px] flex items-center text-sm text-foreground hover:bg-white/[0.07]">
                          <span className="flex-1 text-left">{a.label}</span>
                          {audio === a.value && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                    </SelectPrimitive.Content>
                  </SelectPrimitive.Portal>
                </SelectPrimitive.Root>
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => { refreshDevices?.(); toast.success('Sources audio actualisées'); }} className="h-8 px-3 rounded-[4px] bg-white/[0.07] hover:bg-white/10 text-sm text-white flex items-center gap-1.5 whitespace-nowrap">
                    <RefreshCw className="w-4 h-4" /> Actualiser les sources audio
                  </button>
                  <button type="button" disabled={!onOpenAudioSettings} onClick={() => { onOpenChange(false); onOpenAudioSettings?.(); }} className="h-8 px-3 rounded-[4px] bg-white/[0.07] hover:bg-white/10 disabled:opacity-50 text-sm text-white flex items-center gap-1.5 whitespace-nowrap">
                    <Settings className="w-4 h-4" /> Ouvrir les paramètres audio
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-5 py-4 border-t border-white/[0.06] shrink-0">
            <button type="button" onClick={() => onOpenChange(false)} className="flex-1 h-10 rounded-lg bg-white/[0.07] hover:bg-white/10 text-sm font-medium text-white transition-colors">Annuler</button>
            <button type="button" onClick={start} className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-sm font-medium text-white transition-colors">Passer en direct</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
