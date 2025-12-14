import { useState } from 'react';
import { X, ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJoinByInvite } from '@/hooks/useInvites';

interface JoinServerModalProps {
  onClose: () => void;
  onBack: () => void;
  onJoinSuccess: (serverId: string) => void;
  onDiscoverClick?: () => void;
}

export function JoinServerModal({ onClose, onBack, onJoinSuccess, onDiscoverClick }: JoinServerModalProps) {
  const [inviteLink, setInviteLink] = useState('');
  const { mutate: joinByInvite, isPending } = useJoinByInvite();

  const extractInviteCode = (input: string): string => {
    // Handle different formats
    const trimmed = input.trim();
    
    // If it's a full URL, extract the code
    if (trimmed.includes('/invite/')) {
      const parts = trimmed.split('/invite/');
      return parts[parts.length - 1].split('?')[0].split('/')[0];
    }
    
    // If it's a discord.gg style link
    if (trimmed.includes('discord.gg/')) {
      const parts = trimmed.split('discord.gg/');
      return parts[parts.length - 1].split('?')[0].split('/')[0];
    }
    
    // Otherwise, treat it as a raw code
    return trimmed;
  };

  const handleJoin = () => {
    if (!inviteLink.trim()) return;
    
    const code = extractInviteCode(inviteLink);
    
    joinByInvite(code, {
      onSuccess: (serverId) => {
        onJoinSuccess(serverId);
        onClose();
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inviteLink.trim()) {
      handleJoin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-2xl overflow-hidden animate-slide-in-right">
        {/* Header */}
        <div className="p-6 text-center relative">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute right-4 top-4"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <h2 className="text-2xl font-display font-bold">
            Rejoindre un serveur
          </h2>
          <p className="text-muted-foreground mt-2">
            Entrez une invitation ci-dessous pour rejoindre un serveur existant
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Lien d'invitation <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="https://discord.gg/hTKzmak ou hTKzmak"
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {/* Examples */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Les invitations doivent ressembler à
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>hTKzmak</p>
              <p>https://discord.gg/hTKzmak</p>
              <p>https://discord.gg/cool-people</p>
            </div>
          </div>

          {/* Discover link */}
          <div className="pt-2 border-t border-border">
            <button 
              onClick={() => {
                onClose();
                onDiscoverClick?.();
              }}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Compass className="w-4 h-4" />
              Vous n'avez pas d'invitation ? Découvrez des communautés publiques dans la Découverte de serveurs.
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button
              variant="gaming"
              className="flex-1"
              onClick={handleJoin}
              disabled={!inviteLink.trim() || isPending}
            >
              {isPending ? 'Connexion...' : 'Rejoindre le serveur'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
