// Sound effects for voice channel events using Web Audio API
class SoundEffectsManager {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Could not play sound:', e);
    }
  }

  private playChord(frequencies: number[], duration: number, volume: number = 0.15) {
    frequencies.forEach(freq => this.playTone(freq, duration, 'sine', volume));
  }

  playJoin() {
    // Ascending pleasant chord
    const ctx = this.getContext();
    this.playTone(440, 0.1, 'sine', 0.2); // A4
    setTimeout(() => this.playTone(554, 0.1, 'sine', 0.2), 50); // C#5
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.2), 100); // E5
  }

  playLeave() {
    // Descending notes
    this.playTone(659, 0.1, 'sine', 0.2); // E5
    setTimeout(() => this.playTone(554, 0.1, 'sine', 0.2), 50); // C#5
    setTimeout(() => this.playTone(440, 0.15, 'sine', 0.2), 100); // A4
  }

  playMute() {
    // Short low beep
    this.playTone(330, 0.08, 'sine', 0.15);
  }

  playUnmute() {
    // Short high beep
    this.playTone(523, 0.08, 'sine', 0.15);
  }

  playDeafen() {
    // Double low beep
    this.playTone(262, 0.06, 'sine', 0.15);
    setTimeout(() => this.playTone(262, 0.06, 'sine', 0.15), 80);
  }

  playUndeafen() {
    // Double high beep
    this.playTone(523, 0.06, 'sine', 0.15);
    setTimeout(() => this.playTone(659, 0.06, 'sine', 0.15), 80);
  }

  playUserJoin() {
    // Short notification for other user joining
    this.playTone(880, 0.05, 'sine', 0.1);
    setTimeout(() => this.playTone(1047, 0.08, 'sine', 0.1), 40);
  }

  playUserLeave() {
    // Short notification for other user leaving
    this.playTone(523, 0.05, 'sine', 0.1);
    setTimeout(() => this.playTone(392, 0.08, 'sine', 0.1), 40);
  }
}

export const soundEffects = new SoundEffectsManager();
