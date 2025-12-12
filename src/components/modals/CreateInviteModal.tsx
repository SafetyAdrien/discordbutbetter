import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Copy, Check, Link, Loader2 } from 'lucide-react';
import { useCreateInvite } from '@/hooks/useInvites';
import { copyToClipboard } from '@/lib/clipboard';

interface CreateInviteModalProps {
  serverId: string;
  channelName?: string;
  onClose: () => void;
}

export function CreateInviteModal({ serverId, channelName, onClose }: CreateInviteModalProps) {
  const [isPermanent, setIsPermanent] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>('24');
  const [maxUses, setMaxUses] = useState<string>('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const createInvite = useCreateInvite();

  const handleCreate = () => {
    createInvite.mutate({
      serverId,
      expiresIn: isPermanent ? undefined : parseInt(expiresIn),
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      isPermanent,
    }, {
      onSuccess: (data) => {
        setCreatedCode(data.code);
      }
    });
  };

  const handleCopyLink = () => {
    if (createdCode) {
      const link = `${window.location.origin}/invite/${createdCode}`;
      copyToClipboard(link, 'Lien copié !');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inviteLink = createdCode ? `${window.location.origin}/invite/${createdCode}` : '';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Créer une invitation
            {channelName && <span className="text-muted-foreground font-normal">• #{channelName}</span>}
          </DialogTitle>
        </DialogHeader>

        {createdCode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lien d'invitation</Label>
              <div className="flex gap-2">
                <Input 
                  value={inviteLink} 
                  readOnly 
                  className="font-mono text-sm bg-muted"
                />
                <Button onClick={handleCopyLink} variant="outline" size="icon">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              {isPermanent ? (
                <p>✓ Ce lien n'expire jamais</p>
              ) : (
                <p>✓ Expire dans {expiresIn}h</p>
              )}
              {maxUses && <p>✓ Limité à {maxUses} utilisations</p>}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreatedCode(null)} className="flex-1">
                Nouvelle invitation
              </Button>
              <Button onClick={onClose} className="flex-1">
                Terminé
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lien permanent</Label>
                <p className="text-xs text-muted-foreground">Ce lien n'expirera jamais</p>
              </div>
              <Switch checked={isPermanent} onCheckedChange={setIsPermanent} />
            </div>

            {!isPermanent && (
              <div className="space-y-2">
                <Label>Expire après</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 heure</SelectItem>
                    <SelectItem value="6">6 heures</SelectItem>
                    <SelectItem value="12">12 heures</SelectItem>
                    <SelectItem value="24">24 heures</SelectItem>
                    <SelectItem value="48">48 heures</SelectItem>
                    <SelectItem value="168">7 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nombre max d'utilisations (optionnel)</Label>
              <Input
                type="number"
                placeholder="Illimité"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Annuler
              </Button>
              <Button 
                onClick={handleCreate} 
                className="flex-1"
                disabled={createInvite.isPending}
              >
                {createInvite.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer l'invitation
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
