import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Monitor, Zap, Sparkles } from 'lucide-react';
import type { ScreenShareOptions } from '@/utils/webrtc/MediaManager';

interface ScreenShareQualityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (options: ScreenShareOptions) => void;
}

const QUALITY_PRESETS: Array<{
  key: ScreenShareOptions['quality'];
  label: string;
  description: string;
  fps: number;
  icon: typeof Monitor;
}> = [
  { key: 'low', label: 'Fluide', description: '720p • 15 FPS', fps: 15, icon: Zap },
  { key: 'medium', label: 'Meilleure', description: '1080p • 30 FPS', fps: 30, icon: Monitor },
  { key: 'high', label: 'Source', description: '1440p • 60 FPS', fps: 60, icon: Sparkles },
];

export function ScreenShareQualityModal({ open, onOpenChange, onStart }: ScreenShareQualityModalProps) {
  const [quality, setQuality] = useState<ScreenShareOptions['quality']>('medium');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [showCursor, setShowCursor] = useState(true);

  const selectedPreset = QUALITY_PRESETS.find(p => p.key === quality)!;

  const handleStart = () => {
    onStart({
      quality,
      frameRate: selectedPreset.fps,
      audio: includeAudio,
      cursor: showCursor ? 'always' : 'never',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partage d'écran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quality Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Qualité</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_PRESETS.map(preset => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.key}
                    onClick={() => setQuality(preset.key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all',
                      quality === preset.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{preset.label}</span>
                    <span className="text-xs opacity-70">{preset.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="audio-toggle" className="text-sm">Audio système</Label>
              <Switch
                id="audio-toggle"
                checked={includeAudio}
                onCheckedChange={setIncludeAudio}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cursor-toggle" className="text-sm">Afficher le curseur</Label>
              <Switch
                id="cursor-toggle"
                checked={showCursor}
                onCheckedChange={setShowCursor}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleStart}>
            Commencer le partage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
