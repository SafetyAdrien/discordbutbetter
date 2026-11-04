import { useEffect } from 'react';

/* Sonnerie d'appel : deux notes en boucle tant que `active` est vrai (coupee a l'arret ou au demontage). */
export function useRingtone(active: boolean, outgoing = false) {
  useEffect(() => {
    if (!active) return;
    let ctx: AudioContext | null = null;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctx();
    } catch {
      return;
    }
    const audio = ctx;
    const ring = () => {
      const now = audio.currentTime;
      const notes = outgoing ? [440, 440] : [659.25, 523.25, 659.25, 523.25];
      notes.forEach((f, i) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, now + i * 0.22);
        gain.gain.linearRampToValueAtTime(0.06, now + i * 0.22 + 0.02);
        gain.gain.linearRampToValueAtTime(0, now + i * 0.22 + 0.2);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now + i * 0.22);
        osc.stop(now + i * 0.22 + 0.21);
      });
    };
    void audio.resume().catch(() => undefined);
    ring();
    const id = window.setInterval(ring, outgoing ? 3000 : 2200);
    return () => {
      window.clearInterval(id);
      void audio.close().catch(() => undefined);
    };
  }, [active, outgoing]);
}
