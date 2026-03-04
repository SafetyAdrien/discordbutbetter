import { Button } from '@/components/ui/button';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { Loader2 } from 'lucide-react';

export interface VoiceEmptyStateProps {
  channelName: string;
  onJoin?: () => void;
  isConnecting: boolean;
  permissionDenied?: boolean;
}

export function VoiceEmptyState({ channelName, onJoin, isConnecting, permissionDenied }: VoiceEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 voice-gradient-bg" />
      
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
          <StreamlineVoice className="w-12 h-12 text-white/80" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">{channelName}</h2>
        <p className="text-white/60 mb-8">Personne n'est actuellement en vocal</p>
        
        {permissionDenied ? (
          <p className="text-white/60 text-sm">Vous n'avez pas la permission de rejoindre ce salon vocal.</p>
        ) : (
          <Button
            onClick={onJoin}
            disabled={isConnecting || !onJoin}
            className="bg-[hsl(240,4%,89%)] hover:bg-[hsl(240,4%,84%)] text-black px-8 py-6 text-lg rounded-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connexion...
              </>
            ) : (
              'Rejoindre le salon'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
