import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from '@/components/icons/discord/lucide';

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
      <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 space-y-1.5">
        <div className="flex items-start gap-2">
          <MicOff className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-destructive leading-tight">
            Accès au micro bloqué par le navigateur
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Pour le débloquer :
        </p>
        <ol className="text-[11px] text-muted-foreground leading-snug list-decimal pl-4 space-y-0.5">
          <li>Clique sur l'icône <span className="font-semibold">🔒 cadenas</span> (ou ⓘ) à gauche de l'URL en haut de la page.</li>
          <li>Trouve <span className="font-semibold">« Microphone »</span> dans la liste des permissions.</li>
          <li>Passe-le sur <span className="font-semibold">« Autoriser »</span>.</li>
          <li>Recharge l'onglet (F5).</li>
        </ol>
        <p className="text-[10px] text-muted-foreground/80 leading-tight pt-0.5">
          Sur macOS, vérifie aussi <span className="font-semibold">Réglages Système → Confidentialité → Microphone</span> et active ton navigateur.
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
