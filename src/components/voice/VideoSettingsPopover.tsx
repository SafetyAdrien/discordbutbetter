import { useState, useRef, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useAudioDevices } from '@/hooks/useAudioDevices';

interface VideoSettingsPopoverProps {
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export function VideoSettingsPopover({ children, side = 'top', align = 'center' }: VideoSettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    videoInputs,
    settings,
    setCameraDevice,
  } = useAudioDevices();

  // Start preview when popover opens
  useEffect(() => {
    if (open && settings.cameraDeviceId) {
      startPreview();
    }
    
    return () => {
      stopPreview();
    };
  }, [open, settings.cameraDeviceId]);

  // Attach stream to video element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: settings.cameraDeviceId !== 'default' ? { exact: settings.cameraDeviceId } : undefined,
          width: { ideal: 320 },
          height: { ideal: 180 },
        },
        audio: false,
      });
      setPreviewStream(stream);
    } catch (error) {
      console.error('[VideoSettingsPopover] Failed to start preview:', error);
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
  };

  const handleCameraChange = (deviceId: string) => {
    setCameraDevice(deviceId);
    // Restart preview with new device
    stopPreview();
    setTimeout(() => startPreview(), 100);
  };

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
          <div className="font-semibold text-sm text-foreground">Paramètres vidéo</div>
          
          {/* Camera Device */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">CAMÉRA</Label>
            <Select value={settings.cameraDeviceId} onValueChange={handleCameraChange}>
              <SelectTrigger className="h-9 bg-muted/50 border-border">
                <SelectValue placeholder="Sélectionner une caméra" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="default">Caméra par défaut</SelectItem>
                {videoInputs.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Camera Preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">APERÇU</Label>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {previewStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-muted-foreground">Pas de caméra disponible</span>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
