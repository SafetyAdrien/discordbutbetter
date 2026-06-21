import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Headphones, Info } from 'lucide-react';
import { DiscordHeadphones } from '@/components/icons/DiscordHeadphones';
import { DiscordHeadphonesOff } from '@/components/icons/DiscordHeadphonesOff';

interface HeadphonesSettingsPopoverProps {
  children: React.ReactNode;
  outputVolume: number;
  onOutputVolumeChange: (vol: number) => void;
  isDeafened: boolean;
  onToggleDeafen: () => void;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

export function HeadphonesSettingsPopover({
  children,
  outputVolume,
  onOutputVolumeChange,
  isDeafened,
  onToggleDeafen,
  open,
  onOpenChange,
}: HeadphonesSettingsPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
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
