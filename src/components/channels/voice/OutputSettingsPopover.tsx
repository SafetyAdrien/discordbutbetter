import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, Headphones } from 'lucide-react';
import { MicPermissionGate } from './MicPermissionGate';

interface OutputSettingsPopoverProps {
  children: React.ReactNode;
  outputVolume: number;
  onOutputVolumeChange: (vol: number) => void;
  // Fix #6 — device selection
  outputDeviceId?: string;
  availableOutputs?: MediaDeviceInfo[];
  onOutputDeviceChange?: (id: string) => void | Promise<void>;
  outputSinkSupported?: boolean;
  micPermission?: 'granted' | 'denied' | 'prompt' | 'unknown';
  onRequestPermission?: () => Promise<boolean>;
  onOpenRefresh?: () => Promise<void> | void;
}

export function OutputSettingsPopover({
  children,
  outputVolume,
  onOutputVolumeChange,
  outputDeviceId,
  availableOutputs,
  onOutputDeviceChange,
  outputSinkSupported,
  micPermission,
  onRequestPermission,
  onOpenRefresh,
}: OutputSettingsPopoverProps) {
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

  return (
    <Popover onOpenChange={(o) => { if (o) void onOpenRefresh?.(); }}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-72 p-0">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Paramètres de sortie</span>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Volume de sortie</Label>
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
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
