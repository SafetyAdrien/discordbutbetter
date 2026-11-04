import { Switch } from '@/components/ui/switch';
import { useVoice } from '@/contexts/VoiceContext';
import { useMicTest } from '@/hooks/useMicTest';
import { cn } from '@/lib/utils';

/*
 * Fenetre "Suppression du bruit" du bloc vocal (video de reference) : interrupteur, texte d'explication,
 * "Test du micro" (bouton Test / Arreter + vumetre a 20 segments, jaunes quand le micro capte) et mention
 * du moteur. Le moteur est RNNoise (reseau de neurones libre) suivi d'un traitement de clarte : creux a 320 Hz,
 * presence a 3,2 kHz et air a 9 kHz. Ce n'est pas Krisp (technologie proprietaire sous licence).
 */

const SEGMENTS = 20;

export function NoiseSuppressionPanel() {
  const { noiseSuppression, setNoiseSuppression, inputDeviceId } = useVoice();
  const on = noiseSuppression !== 'off';
  const { running, level, error, start, stop } = useMicTest(noiseSuppression, inputDeviceId);
  const lit = Math.round(level * SEGMENTS);

  return (
    <div className="w-[360px] max-w-[calc(100vw-24px)] p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold leading-5">Suppression du bruit</p>
        <Switch checked={on} onCheckedChange={(v) => setNoiseSuppression(v ? 'high' : 'off')} aria-label="Suppression du bruit" />
      </div>
      <p className="mt-2 text-sm leading-5 text-[#dbdee1]">
        Active la suppression du bruit ! Fais du bruit (tape dans tes mains par exemple), tout en parlant. Tes amis n'entendront rien d'autre que ta magnifique voix.
      </p>

      <p className="mt-4 text-base font-semibold leading-5">Test du micro</p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (running ? stop() : void start())}
          className="h-10 min-w-[84px] px-3 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium transition-colors"
        >
          {running ? 'Arrêter' : 'Test'}
        </button>
        <div className="flex-1 flex items-center justify-between h-10" role="meter" aria-label="Niveau du micro" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <span key={i} className={cn('w-[5px] h-[22px] rounded-full transition-colors duration-75', running && i < lit ? 'bg-[#f0b232]' : 'bg-white/[0.14]')} />
          ))}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-[#f57976]">{error}</p>}

      <p className="mt-4 text-base font-semibold leading-5">Optimisé par</p>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-[26px] leading-7 font-extrabold tracking-tight">RNNoise</span>
        <a href="https://jmvalin.ca/demo/rnnoise/" target="_blank" rel="noreferrer" className="text-sm text-[hsl(var(--text-link))] hover:underline">En savoir plus</a>
      </div>
    </div>
  );
}
