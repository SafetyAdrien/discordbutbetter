import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

interface MicPermissionGateProps {
  denied: boolean;
  onRequest: () => Promise<boolean>;
  label?: string;
}

/**
 * Shown inside the device selectors when the browser hasn't unlocked the
 * device list yet (microphone permission not granted). Clicking the button
 * triggers a minimal getUserMedia + enumerateDevices refresh. The UI only
 * flips to the populated <Select> once the refresh awaits resolved upstream.
 */
export function MicPermissionGate({ denied, onRequest, label }: MicPermissionGateProps) {
  const [loading, setLoading] = useState(false);

  if (denied) {
    return (
      <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 flex items-start gap-2">
        <MicOff className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-destructive leading-tight">
          L'accès au micro est bloqué. Autorise-le dans les paramètres du
          navigateur pour voir tes périphériques.
        </p>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full h-auto py-2 text-xs justify-start gap-2"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await onRequest();
        } finally {
          setLoading(false);
        }
      }}
    >
      <Mic className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-left leading-tight">
        {loading
          ? 'Demande en cours…'
          : label || 'Autoriser le micro pour voir vos périphériques'}
      </span>
    </Button>
  );
}
