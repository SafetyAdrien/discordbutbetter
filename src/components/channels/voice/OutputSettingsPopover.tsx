import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Volume2 } from 'lucide-react';

interface OutputSettingsPopoverProps {
  children: React.ReactNode;
  outputVolume: number;
  onOutputVolumeChange: (vol: number) => void;
}

export function OutputSettingsPopover({
  children,
  outputVolume,
  onOutputVolumeChange,
}: OutputSettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="center" className="w-64 p-0">
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
