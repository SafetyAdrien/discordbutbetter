// Sound effects for voice channel events using Web Audio API
class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private preLiveMusicNodes: {
    oscillators: OscillatorNode[];
    gain: GainNode;
  } | null = null;
  private isPlayingPreLive = false;

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

  // Pre-live ambient music - generates a chill lo-fi ambient loop
  playPreLiveMusic() {
    if (this.isPlayingPreLive) return;
    
    try {
      const ctx = this.getContext();
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1);
      
      const oscillators: OscillatorNode[] = [];
      
      // Base drone - low ambient pad
      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      const droneFilter = ctx.createBiquadFilter();
      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(110, ctx.currentTime); // A2
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(200, ctx.currentTime);
      droneGain.gain.setValueAtTime(0.4, ctx.currentTime);
      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(masterGain);
      droneOsc.start();
      oscillators.push(droneOsc);
      
      // Pad layer 1 - fifth harmony
      const padOsc1 = ctx.createOscillator();
      const padGain1 = ctx.createGain();
      padOsc1.type = 'sine';
      padOsc1.frequency.setValueAtTime(165, ctx.currentTime); // E3
      padGain1.gain.setValueAtTime(0.2, ctx.currentTime);
      padOsc1.connect(padGain1);
      padGain1.connect(masterGain);
      padOsc1.start();
      oscillators.push(padOsc1);
      
      // Pad layer 2 - octave
      const padOsc2 = ctx.createOscillator();
      const padGain2 = ctx.createGain();
      padOsc2.type = 'triangle';
      padOsc2.frequency.setValueAtTime(220, ctx.currentTime); // A3
      padGain2.gain.setValueAtTime(0.15, ctx.currentTime);
      padOsc2.connect(padGain2);
      padGain2.connect(masterGain);
      padOsc2.start();
      oscillators.push(padOsc2);
      
      // Subtle high shimmer
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      const shimmerLfo = ctx.createOscillator();
      const shimmerLfoGain = ctx.createGain();
      shimmerOsc.type = 'sine';
      shimmerOsc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      shimmerLfo.type = 'sine';
      shimmerLfo.frequency.setValueAtTime(0.1, ctx.currentTime);
      shimmerLfoGain.gain.setValueAtTime(0.05, ctx.currentTime);
      shimmerGain.gain.setValueAtTime(0.08, ctx.currentTime);
      shimmerLfo.connect(shimmerLfoGain);
      shimmerLfoGain.connect(shimmerGain.gain);
      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(masterGain);
      shimmerOsc.start();
      shimmerLfo.start();
      oscillators.push(shimmerOsc, shimmerLfo);
      
      this.preLiveMusicNodes = { oscillators, gain: masterGain };
      this.isPlayingPreLive = true;
      
      console.log('[SoundEffects] Pre-live music started');
    } catch (e) {
      console.warn('Could not play pre-live music:', e);
    }
  }

  stopPreLiveMusic() {
    if (!this.preLiveMusicNodes || !this.isPlayingPreLive) return;
    
    try {
      const ctx = this.getContext();
      const { oscillators, gain } = this.preLiveMusicNodes;
      
      // Fade out
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      
      // Stop after fade
      setTimeout(() => {
        oscillators.forEach(osc => {
          try {
            osc.stop();
            osc.disconnect();
          } catch (e) {
            // Already stopped
          }
        });
        gain.disconnect();
      }, 1100);
      
      this.preLiveMusicNodes = null;
      this.isPlayingPreLive = false;
      
      console.log('[SoundEffects] Pre-live music stopped');
    } catch (e) {
      console.warn('Could not stop pre-live music:', e);
    }
  }

  isPreLivePlaying(): boolean {
    return this.isPlayingPreLive;
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

  playMessageNotification() {
    // Pleasant notification ding for new messages
    this.playTone(880, 0.08, 'sine', 0.15); // A5
    setTimeout(() => this.playTone(1175, 0.12, 'sine', 0.12), 60); // D6
  }

  playMentionNotification() {
    // More attention-grabbing sound for mentions
    this.playTone(1047, 0.06, 'sine', 0.18); // C6
    setTimeout(() => this.playTone(1319, 0.06, 'sine', 0.18), 50); // E6
    setTimeout(() => this.playTone(1568, 0.1, 'sine', 0.15), 100); // G6
  }
}

export const soundEffects = new SoundEffectsManager();
