import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Volume2, Radio } from 'lucide-react';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { useVoice } from '@/contexts/VoiceContext';

interface VoiceMoreOptionsMenuProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export function VoiceMoreOptionsMenu({ children, side = 'top', align = 'center' }: VoiceMoreOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const { settings, setMasterVolume } = useAudioDevices();
  const { isPushToTalkMode, togglePushToTalkMode } = useVoice();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        align={align}
        className="w-72 p-4 bg-popover border-border"
        sideOffset={8}
      >
        <div className="space-y-4">
          <div className="font-semibold text-sm text-foreground">Plus d'options</div>
          
          {/* Master Volume */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">VOLUME DE SORTIE</Label>
              <span className="ml-auto text-xs text-muted-foreground">{settings.masterVolume}%</span>
            </div>
            <Slider
              value={[settings.masterVolume]}
              onValueChange={([value]) => setMasterVolume(value)}
              max={200}
              step={1}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Au-dessus de 100% amplifie le son
            </p>
          </div>

          <Separator className="bg-border" />

          {/* Push-to-Talk Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="text-sm">Push-to-Talk</Label>
                <p className="text-xs text-muted-foreground">Appuyez pour parler</p>
              </div>
            </div>
            <Switch
              checked={isPushToTalkMode}
              onCheckedChange={togglePushToTalkMode}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
