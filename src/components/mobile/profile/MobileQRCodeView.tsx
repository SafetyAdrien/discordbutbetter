import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, Check, Camera } from 'lucide-react';
import { MobileProfileSubpage } from './MobileProfileSubpage';
import { uuidToSnowflake } from '@/lib/snowflake';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { useState } from 'react';

interface Props {
  onBack: () => void;
}

export function MobileQRCodeView({ onBack }: Props) {
  const { profile, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const initial = (profile?.display_name || '?').charAt(0).toUpperCase();
  const snowflake = user?.id ? uuidToSnowflake(user.id) : '';

  // Construct an "add friend" deep-link payload so QR scans work in-app
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lovable.app';
  const qrPayload = `${baseUrl}/?addFriend=${profile?.username || ''}`;

  const handleCopy = async () => {
    haptics.light();
    await navigator.clipboard.writeText(snowflake);
    setCopied(true);
    toast.success('Identifiant copié');
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    haptics.light();
    const text = `Ajoute-moi sur Lovable : @${profile?.username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Ajoute-moi', text, url: qrPayload });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(qrPayload);
      toast.success('Lien copié');
    }
  };

  return (
    <MobileProfileSubpage title="Mon code QR" onBack={onBack}>
      <div className="flex flex-col items-center px-6 pt-8 pb-12">
        {/* QR card */}
        <div
          className="w-full max-w-sm rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: profile?.theme_color
              ? `linear-gradient(135deg, ${profile.theme_color}, hsl(var(--primary)))`
              : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))',
          }}
        >
          {/* Identity */}
          <div className="flex flex-col items-center text-center mb-4">
            <Avatar className="w-20 h-20 ring-4 ring-white/40">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-white/20 text-white text-2xl font-semibold">
                {initial}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-3 font-bold text-lg text-white">{profile?.display_name}</h2>
            <p className="text-sm text-white/80">@{profile?.username}</p>
          </div>

          {/* QR code panel */}
          <div className="bg-white rounded-2xl p-5 flex items-center justify-center">
            <QRCodeSVG value={qrPayload} size={200} level="M" includeMargin={false} />
          </div>

          <p className="text-center text-[11px] text-white/70 mt-4">
            Demande à un ami de scanner pour t'ajouter
          </p>
        </div>

        {/* Actions */}
        <div className="w-full max-w-sm mt-6 space-y-3">
          <button
            onClick={handleShare}
            className="w-full h-12 rounded-xl bg-card border border-border/50 flex items-center justify-center gap-2 text-sm font-medium active:bg-muted/60 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Partager mon code
          </button>
          <button
            onClick={handleCopy}
            className="w-full h-12 rounded-xl bg-card border border-border/50 flex items-center justify-center gap-2 text-sm font-medium active:bg-muted/60 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-[hsl(var(--online))]" /> : <Copy className="w-4 h-4" />}
            Copier mon identifiant
          </button>
          <button
            onClick={() => {
              haptics.light();
              toast.info('Scanner bientôt disponible');
            }}
            className="w-full h-12 rounded-xl bg-card border border-border/50 flex items-center justify-center gap-2 text-sm font-medium active:bg-muted/60 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Scanner un code QR
          </button>
        </div>
      </div>
    </MobileProfileSubpage>
  );
}
