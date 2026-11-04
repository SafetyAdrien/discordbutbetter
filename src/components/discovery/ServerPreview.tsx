import { ArrowLeft } from 'lucide-react';
import { Hash } from '@/components/icons/discord/lucide';
import { Button } from '@/components/ui/button';
import type { DiscoveryServer } from '@/hooks/useDiscovery';
import { CommunityBadge } from './DiscoveryParts';

/*
 * Apercu d'un serveur public depuis la Decouverte : bandeau bleu "Tu es en mode apercu" (Retour + Rejoindre),
 * en-tete du serveur, message de bienvenue et zone de saisie verrouillee. Les salons ne sont lisibles qu'une fois
 * membre : l'apercu montre les informations publiques du serveur.
 */
export function ServerPreview({ server, joining, onBack, onJoin }: { server: DiscoveryServer; joining: boolean; onBack: () => void; onJoin: () => void }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col animate-fade-in">
      <div className="shrink-0 h-[50px] px-3 flex items-center gap-4 bg-[#5865f2] text-white">
        <button type="button" onClick={onBack} className="h-8 px-3 rounded-[4px] bg-black/25 hover:bg-black/35 flex items-center gap-2 text-sm font-semibold transition-colors"><ArrowLeft className="w-4 h-4" /> Retour</button>
        <p className="flex-1 text-center text-sm">Tu es en mode aperçu. Rejoins ce serveur pour discuter !</p>
        <Button onClick={onJoin} disabled={joining || server.is_member} className="h-8 px-3 rounded-full bg-transparent border border-white text-white text-sm font-semibold hover:bg-white/15" translate="no">
          {server.is_member ? 'Déjà membre' : joining ? 'Connexion…' : `Rejoindre ${server.name}`}
        </Button>
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="w-[280px] shrink-0 bg-surface-1 flex flex-col">
          <div className="h-[130px] bg-[#2b2c31] relative overflow-hidden">
            {server.banner_url && <img src={server.banner_url} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent" />
            <p translate="no" className="absolute left-4 bottom-2.5 flex items-center gap-1.5 text-base font-semibold text-white">{server.is_community && <CommunityBadge />}{server.name}</p>
          </div>
          <p className="px-4 pt-4 text-xs text-[#949ba4]">Les salons sont visibles une fois le serveur rejoint.</p>
        </div>
        <div className="flex-1 min-w-0 flex flex-col bg-[#313139]">
          <div className="h-12 px-4 flex items-center gap-2 border-b border-black/20 text-white font-semibold"><Hash className="w-5 h-5 text-[#949ba4]" />accueil</div>
          <div className="flex-1 flex flex-col items-center justify-end pb-8 text-center px-6">
            <h2 translate="no" className="text-[28px] leading-8 font-semibold text-white max-w-[380px]">Bienvenue sur {server.name}</h2>
            <p translate="no" className="mt-3 text-sm text-[#b5bac1] max-w-[420px]">{server.description || 'Ceci est le début de la vie de ce serveur.'}</p>
            <p className="mt-3 text-xs text-[#949ba4]">{server.online_count} en ligne · {server.member_count} {server.member_count > 1 ? 'membres' : 'membre'}</p>
          </div>
          <div className="mx-4 mb-4 h-[52px] rounded-lg bg-[#383840] flex items-center px-4 text-[15px] text-[#80848e] cursor-not-allowed">Tu n'as pas la permission d'envoyer des messages dans ce salon.</div>
        </div>
      </div>
    </div>
  );
}
