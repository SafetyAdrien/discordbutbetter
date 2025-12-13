import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { useVoice } from '@/contexts/VoiceContext';
import { cn } from '@/lib/utils';

interface VoiceSettingsPopoverProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export function VoiceSettingsPopover({ children, side = 'top', align = 'center' }: VoiceSettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [testLevel, setTestLevel] = useState(0);
  const { localAudioLevel } = useVoice();
  
  const {
    audioInputs,
    audioOutputs,
    settings,
    setInputDevice,
    setOutputDevice,
    setNoiseSuppression,
    setEchoCancellation,
    setAutoGainControl,
    setVadSensitivity,
  } = useAudioDevices();

  // Update test level from voice context
  useEffect(() => {
    if (open) {
      setTestLevel(localAudioLevel);
    }
  }, [localAudioLevel, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        side={side} 
        align={align}
        className="w-80 p-4 bg-popover border-border"
        sideOffset={8}
      >
        <div className="space-y-4">
          <div className="font-semibold text-sm text-foreground">Paramètres audio</div>
          
          {/* Input Device */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">PÉRIPHÉRIQUE D'ENTRÉE</Label>
            <Select value={settings.inputDeviceId} onValueChange={setInputDevice}>
              <SelectTrigger className="h-9 bg-muted/50 border-border">
                <SelectValue placeholder="Sélectionner un microphone" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {audioInputs.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mic Test Level */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">TEST DU MICROPHONE</Label>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-[hsl(var(--online))] transition-all duration-75"
                style={{ width: `${testLevel * 100}%` }}
              />
            </div>
          </div>

          {/* Output Device */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">PÉRIPHÉRIQUE DE SORTIE</Label>
            <Select value={settings.outputDeviceId} onValueChange={setOutputDevice}>
              <SelectTrigger className="h-9 bg-muted/50 border-border">
                <SelectValue placeholder="Sélectionner un haut-parleur" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {audioOutputs.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />

          {/* VAD Sensitivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">SENSIBILITÉ DU MICRO</Label>
              <span className="text-xs text-muted-foreground">{settings.vadSensitivity}%</span>
            </div>
            <Slider
              value={[settings.vadSensitivity]}
              onValueChange={([value]) => setVadSensitivity(value)}
              max={100}
              step={1}
              className="cursor-pointer"
            />
          </div>

          <Separator className="bg-border" />

          {/* Audio Processing Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Suppression du bruit</Label>
                <p className="text-xs text-muted-foreground">Réduit le bruit de fond</p>
              </div>
              <Switch
                checked={settings.noiseSuppression}
                onCheckedChange={setNoiseSuppression}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Annulation de l'écho</Label>
                <p className="text-xs text-muted-foreground">Évite les retours audio</p>
              </div>
              <Switch
                checked={settings.echoCancellation}
                onCheckedChange={setEchoCancellation}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Contrôle automatique du gain</Label>
                <p className="text-xs text-muted-foreground">Ajuste le volume automatiquement</p>
              </div>
              <Switch
                checked={settings.autoGainControl}
                onCheckedChange={setAutoGainControl}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
