import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Headphones, Info } from 'lucide-react';
import { DiscordHeadphones } from '@/components/icons/DiscordHeadphones';
import { DiscordHeadphonesOff } from '@/components/icons/DiscordHeadphonesOff';
import { MicPermissionGate } from './MicPermissionGate';

interface HeadphonesSettingsPopoverProps {
  children: React.ReactNode;
  outputVolume: number;
  onOutputVolumeChange: (vol: number) => void;
  isDeafened: boolean;
  onToggleDeafen: () => void;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  // Fix C — optional output device selection
  outputDeviceId?: string;
  availableOutputs?: MediaDeviceInfo[];
  onOutputDeviceChange?: (id: string) => void | Promise<void>;
  outputSinkSupported?: boolean;
  outputSinkPartial?: boolean;
  // Permission gating (audiooutput labels require mic permission on most browsers)
  micPermission?: 'granted' | 'denied' | 'prompt' | 'unknown';
  onRequestPermission?: () => Promise<boolean>;
  onOpenRefresh?: () => Promise<void> | void;
}

export function HeadphonesSettingsPopover({
  children,
  outputVolume,
  onOutputVolumeChange,
  isDeafened,
  onToggleDeafen,
  open,
  onOpenChange,
  outputDeviceId,
  availableOutputs,
  onOutputDeviceChange,
  outputSinkSupported,
  outputSinkPartial,
  micPermission,
  onRequestPermission,
  onOpenRefresh,
}: HeadphonesSettingsPopoverProps) {
  const showDeviceSelector =
    typeof onOutputDeviceChange === 'function' && Array.isArray(availableOutputs);
  const realOutputs = (availableOutputs || []).filter(
    (d) => d.deviceId && d.deviceId !== 'default' && d.label
  );
  const needsPermission =
    showDeviceSelector &&
    typeof onRequestPermission === 'function' &&
    realOutputs.length === 0 &&
    micPermission !== 'granted';

  const handleOpenChange = (o: boolean) => {
    if (o && typeof onOpenRefresh === 'function') {
      void onOpenRefresh();
    }
    onOpenChange?.(o);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-72 p-0">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Paramètres du son</span>
          </div>

          <Separator />

          {/* Output volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Volume général</Label>
              <span className="text-xs font-medium tabular-nums">{outputVolume}%</span>
            </div>
            <Slider
              value={[outputVolume]}
              min={0}
              max={200}
              step={1}
              onValueChange={([v]) => onOutputVolumeChange(v)}
            />
          </div>

          {showDeviceSelector && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Headphones className="w-3.5 h-3.5 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Périphérique de sortie</Label>
                </div>
                {needsPermission ? (
                  <MicPermissionGate
                    denied={micPermission === 'denied'}
                    onRequest={onRequestPermission!}
                    label="Autoriser le micro pour lister les sorties audio"
                  />
                ) : (
                  <Select
                    value={outputDeviceId || 'default'}
                    onValueChange={(v) => onOutputDeviceChange!(v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Périphérique par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Périphérique par défaut</SelectItem>
                      {realOutputs.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>
                          {d.label || `Sortie ${d.deviceId.slice(0, 6)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!needsPermission && outputSinkSupported === false && (
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Ce navigateur ne supporte pas pleinement le changement de sortie audio.
                  </p>
                )}
                {!needsPermission && outputSinkSupported !== false && outputSinkPartial === true && (
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Certains flux peuvent ignorer ce choix sur ce navigateur.
                  </p>
                )}
              </div>
            </>
          )}


          <Separator />

          {/* Deafen toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleDeafen}
            className={cn(
              'w-full justify-start gap-2 h-9',
              isDeafened && 'bg-destructive/15 text-destructive hover:bg-destructive/25'
            )}
          >
            {isDeafened ? (
              <DiscordHeadphonesOff className="w-4 h-4" />
            ) : (
              <DiscordHeadphones className="w-4 h-4" />
            )}
            <span className="text-xs">
              {isDeafened ? 'Réactiver le son' : 'Couper le son'}
            </span>
          </Button>

          <Separator />

          {/* Info */}
          <div className="flex items-start gap-2 p-2 rounded-md bg-muted/40">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Clique-droit sur un utilisateur en vocal pour ajuster son volume individuellement.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
