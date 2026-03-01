import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';

interface ExternalLinkWarningModalProps {
  url: string;
  onClose: () => void;
}

export function ExternalLinkWarningModal({ url, onClose }: ExternalLinkWarningModalProps) {
  return (
    <ResponsiveModal open={true} onOpenChange={(open) => !open && onClose()} title="Lien externe">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tu es sur le point de visiter un site externe. Vérifie que tu fais confiance à cette URL avant de continuer.
        </p>

        <div className="flex items-center gap-2">
          <Input
            value={url}
            readOnly
            className="flex-1 text-sm font-mono"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => copyToClipboard(url, 'URL copiée')}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-[#5865f2] hover:bg-[#5865f2]/90"
            onClick={() => {
              window.open(url, '_blank', 'noopener,noreferrer');
              onClose();
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ouvrir le lien
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
