import { useState } from 'react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ExternalLink, Copy } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';
import { useUpdateChannel } from '@/hooks/useChannelSettings';

interface ExternalLinkWarningModalProps {
  url: string;
  onClose: () => void;
  channelId?: string;
  serverId?: string;
  isLinkTrusted?: boolean;
}

export function ExternalLinkWarningModal({ url, onClose, channelId, serverId, isLinkTrusted = false }: ExternalLinkWarningModalProps) {
  const [trusted, setTrusted] = useState(isLinkTrusted);
  const updateChannel = useUpdateChannel();

  const handleOpen = async () => {
    // Save trust state if changed and we have channel context
    if (channelId && serverId && trusted !== isLinkTrusted) {
      try {
        await updateChannel.mutateAsync({
          channelId,
          serverId,
          is_link_trusted: trusted,
        });
      } catch (e) {
        console.error('Failed to update trust setting:', e);
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

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

        {/* Trust checkbox - only show for link channels */}
        {channelId && serverId && (
          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <Checkbox
              id="link-trusted-modal"
              checked={trusted}
              onCheckedChange={(checked) => setTrusted(checked === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="link-trusted-modal" className="font-medium cursor-pointer">
                Lien de confiance
              </Label>
              <p className="text-sm text-muted-foreground">
                Les membres pourront ouvrir ce lien directement sans passer par l'avertissement de lien externe.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="bg-[#5865f2] hover:bg-[#5865f2]/90"
            onClick={handleOpen}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ouvrir le lien
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
