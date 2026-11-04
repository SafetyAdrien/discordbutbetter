import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioProcessor, type NoiseSuppressonMode } from '@/utils/webrtc/AudioProcessor';

/*
 * Test du micro : ouvre le micro, le fait passer par la meme chaine de traitement que la voix (suppression du bruit,
 * filtres de clarte) et expose son niveau (0..1) pour le vumetre. Rien n'est envoye ni enregistre.
 */
export function useMicTest(mode: NoiseSuppressonMode, deviceId?: string) {
  const [running, setRunning] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<{ stream: MediaStream; proc: AudioProcessor; raf: number } | null>(null);

  const stop = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    cancelAnimationFrame(s.raf);
    s.stream.getTracks().forEach((t) => t.stop());
    try { s.proc.cleanup(); } catch { /* deja ferme */ }
    stateRef.current = null;
    setRunning(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, ...(deviceId && deviceId !== 'default' ? { deviceId: { exact: deviceId } } : {}) },
      });
      const proc = new AudioProcessor({ noiseSuppression: mode });
      await proc.processStream(stream);
      let smooth = 0;
      const tick = () => {
        // Niveau efficace amplifie : une voix normale remplit environ la moitie du vumetre.
        const raw = Math.min(1, proc.getAudioLevel() * 3.2);
        smooth = raw > smooth ? raw : smooth * 0.85 + raw * 0.15;
        setLevel(smooth);
        if (stateRef.current) stateRef.current.raf = requestAnimationFrame(tick);
      };
      stateRef.current = { stream, proc, raf: requestAnimationFrame(tick) };
      setRunning(true);
    } catch (e) {
      setError((e as Error)?.name === 'NotAllowedError' ? "L'accès au micro est refusé." : "Impossible d'ouvrir le micro.");
    }
  }, [mode, deviceId]);

  useEffect(() => stop, [stop]);
  // Le mode de suppression change : on relance pour que le test reflete le reglage.
  useEffect(() => { if (stateRef.current) { stop(); void start(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [mode]);

  return { running, level, error, start, stop };
}
