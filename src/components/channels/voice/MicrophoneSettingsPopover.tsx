import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ShieldCheck, AudioLines, SlidersHorizontal } from 'lucide-react';
import type { NoiseSuppressonMode, VADSensitivity } from '@/utils/webrtc/AudioProcessor';

interface MicrophoneSettingsPopoverProps {
  children: React.ReactNode;
  micVolume: number;
  onMicVolumeChange: (vol: number) => void;
  vadSensitivity: VADSensitivity;
  onVadSensitivityChange: (s: VADSensitivity) => void;
  noiseSuppression: NoiseSuppressonMode;
  onNoiseSuppressionChange: (m: NoiseSuppressonMode) => void;
  rnnoiseAvailable: boolean;
  enableDeEsser: boolean;
  onToggleDeEsser: (v: boolean) => void;
  enableLowShelf: boolean;
  onToggleLowShelf: (v: boolean) => void;
  enableHighPass: boolean;
  onToggleHighPass: (v: boolean) => void;
}

const vadLabels: Record<VADSensitivity, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée',
};

const nsLabels: Record<NoiseSuppressonMode, string> = {
  off: 'Désactivé',
  low: 'Faible',
  high: 'Fort',
};

export function MicrophoneSettingsPopover({
  children,
  micVolume,
  onMicVolumeChange,
  vadSensitivity,
  onVadSensitivityChange,
  noiseSuppression,
  onNoiseSuppressionChange,
  rnnoiseAvailable,
  enableDeEsser,
  onToggleDeEsser,
  enableLowShelf,
  onToggleLowShelf,
  enableHighPass,
  onToggleHighPass,
}: MicrophoneSettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-72 p-0">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Paramètres du micro</span>
          </div>

          <Separator />

          {/* Mic Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Volume du micro</Label>
              <span className="text-xs font-medium tabular-nums">{micVolume}%</span>
            </div>
            <Slider
              value={[micVolume]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => onMicVolumeChange(v)}
            />
          </div>

          <Separator />

          {/* VAD Sensitivity */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sensibilité du micro</Label>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as VADSensitivity[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onVadSensitivityChange(s)}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded-md transition-colors',
                    vadSensitivity === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {vadLabels[s]}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Krisp / Noise Suppression */}
          {rnnoiseAvailable && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Krisp (suppression de bruit)</Label>
                </div>
                <div className="flex gap-1">
                  {(['off', 'low', 'high'] as NoiseSuppressonMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => onNoiseSuppressionChange(m)}
                      className={cn(
                        'flex-1 py-1.5 text-xs rounded-md transition-colors',
                        noiseSuppression === m
                          ? m === 'off' ? 'bg-muted-foreground/20 text-foreground' : 'bg-[hsl(var(--online))]/20 text-[hsl(var(--online))]'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      )}
                    >
                      {nsLabels[m]}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Audio Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AudioLines className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Filtres audio</Label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs">Passe-haut (80Hz)</span>
                <Switch checked={enableHighPass} onCheckedChange={onToggleHighPass} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">De-esser (sifflantes)</span>
                <Switch checked={enableDeEsser} onCheckedChange={onToggleDeEsser} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Boost basses (+2dB)</span>
                <Switch checked={enableLowShelf} onCheckedChange={onToggleLowShelf} />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
