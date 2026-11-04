export interface VoiceEmptyStateProps {
  channelName: string;
  onJoin?: () => void;
  isConnecting: boolean;
  permissionDenied?: boolean;
}

/*
 * Salon vocal vide (video de reference) : le fond degrade occupe toute la zone
 * (en-tete comprise, fournie par le parent), titre, phrase et bouton blanc
 * centres.
 */
export function VoiceEmptyState({ channelName, onJoin, isConnecting, permissionDenied }: VoiceEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pb-12">
      <h2 translate="no" className="text-[31px] leading-8 font-semibold text-[#e3e4f2] mb-2">{channelName}</h2>
      <p className="text-xs leading-[18px] text-[#c9cbe0] mb-[26px]">Personne n'est actuellement dans un salon vocal.</p>

      {permissionDenied ? (
        <p className="text-sm text-[#c9cbe0]">Vous n'avez pas la permission de rejoindre ce salon vocal.</p>
      ) : (
        <button
          type="button"
          onClick={onJoin}
          disabled={isConnecting || !onJoin}
          className="h-10 px-4 rounded-lg bg-[#fdfdfd] hover:bg-white active:bg-[#ececf0] text-black text-base font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isConnecting ? 'Connexion...' : 'Rejoindre le salon vocal'}
        </button>
      )}
    </div>
  );
}
