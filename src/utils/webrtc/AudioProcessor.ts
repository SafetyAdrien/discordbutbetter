/**
 * Advanced Audio Processor with RNNoise noise suppression, spectral VAD, and adaptive threshold
 * Krisp-like noise suppression via RNNoise WASM + FFT-based voice activity detection
 */

import { NoiseSuppressorWorklet_Name } from '@timephy/rnnoise-wasm';

export type NoiseSuppressonMode = 'off' | 'low' | 'high';
export type VADSensitivity = 'low' | 'medium' | 'high';

export interface AudioProcessorConfig {
  noiseGateThreshold: number;      // -100 to 0 dB
  noiseGateAttack: number;         // ms
  noiseGateRelease: number;        // ms
  highPassFrequency: number;       // Hz (cut below this)
  compressionThreshold: number;    // dB
  compressionRatio: number;        // ratio (e.g., 4 = 4:1)
  enableNoiseGate: boolean;
  enableCompression: boolean;
  enableHighPass: boolean;
  enableRNNoise: boolean;          // Krisp-like ML noise suppression
  noiseSuppression: NoiseSuppressonMode;
  vadSensitivity: VADSensitivity;
}

export interface VADState {
  isSpeaking: boolean;
  level: number;
  adaptiveThreshold: number;
  spectralVoiceScore: number;      // 0-1 how "voice-like" the signal is
}

const DEFAULT_CONFIG: AudioProcessorConfig = {
  noiseGateThreshold: -50,
  noiseGateAttack: 5,
  noiseGateRelease: 50,
  highPassFrequency: 80,
  compressionThreshold: -24,
  compressionRatio: 4,
  enableNoiseGate: true,
  enableCompression: true,
  enableHighPass: true,
  enableRNNoise: true,
  noiseSuppression: 'high',
  vadSensitivity: 'high',
};

// VAD sensitivity presets
const VAD_PRESETS: Record<VADSensitivity, { spectralSpeak: number; spectralStop: number; holdMs: number }> = {
  low:    { spectralSpeak: 0.40, spectralStop: 0.25, holdMs: 300 },
  medium: { spectralSpeak: 0.30, spectralStop: 0.18, holdMs: 220 },
  high:   { spectralSpeak: 0.25, spectralStop: 0.12, holdMs: 180 },
};

// Vocal fundamental frequency range (Hz)
const VOICE_FREQ_LOW = 85;
const VOICE_FREQ_HIGH = 300;
// Vocal formant range (broader harmonics)
const FORMANT_FREQ_LOW = 300;
const FORMANT_FREQ_HIGH = 3400;

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private deEsserFilter: BiquadFilterNode | null = null;
  private lowShelfFilter: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  /** User-controlled mic input gain (0..2). Decoupled from the noise gate. */
  private gainNode: GainNode | null = null;
  /** Dedicated noise-gate gain so the VAD never overrides mic volume (Fix #2). */
  private gateGainNode: GainNode | null = null;
  private rnnoiseGainNode: GainNode | null = null;
  /** Node feeding into the RNNoise branch — kept so we can bypass cleanly (Fix #1). */
  private preRNNoiseTap: AudioNode | null = null;
  /** True when RNNoise is currently bypassed (mode=off). */
  private rnnoiseBypassed = false;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private rnnoiseNode: AudioWorkletNode | null = null;
  private rnnoiseLoaded = false;
  
  private config: AudioProcessorConfig;
  private processedStream: MediaStream | null = null;
  
  // Adaptive VAD state
  private ambientNoiseLevel = 0.05;
  private ambientSamples: number[] = [];
  private readonly AMBIENT_SAMPLE_SIZE = 60;
  private readonly AMBIENT_UPDATE_INTERVAL = 50;
  
  // Spectral VAD history for smoothing (exponential weighting)
  private spectralHistory: number[] = [];
  private readonly SPECTRAL_HISTORY_SIZE = 5;
  
  // Noise gate state
  private isGateOpen = false;
  private gateHoldTimer: NodeJS.Timeout | null = null;
  
  // Speaking state with hysteresis
  private speakingState = false;
  private speakingHoldTimer: NodeJS.Timeout | null = null;

  // Public state for UI
  public rnnoiseAvailable = false;

  constructor(config: Partial<AudioProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Load the RNNoise AudioWorklet module.
   *
   * The worklet is served from /rnnoise/ (copied from
   * @timephy/rnnoise-wasm/dist via vite-plugin-static-copy at build time).
   * Serving it at a stable absolute path is required because the worklet
   * file contains relative ES imports (./polyfills, ./RnnoiseProcessor,
   * ./generated/rnnoise-sync, ./math, ./index) that the browser resolves
   * itself — AudioWorkletGlobalScope does NOT bundle dependencies.
   *
   * Earlier `new URL('@timephy/...', import.meta.url)` did not work because
   * the browser URL constructor doesn't resolve bare specifiers; the SPA
   * fallback returned index.html with a text/html MIME, breaking the load.
   */
  private async loadRNNoise(ctx: AudioContext): Promise<boolean> {
    if (this.rnnoiseLoaded) return true;

    try {
      await ctx.audioWorklet.addModule('/rnnoise/NoiseSuppressorWorklet.js');
      this.rnnoiseLoaded = true;
      this.rnnoiseAvailable = true;
      console.log('[AudioProcessor] RNNoise WASM worklet loaded successfully');
      return true;
    } catch (error) {
      console.warn('[AudioProcessor] RNNoise worklet load failed, continuing without RNNoise:', error);
      this.rnnoiseAvailable = false;
      return false;
    }
  }

  /**
   * Process an audio stream through the audio processing chain
   * Chain: Source -> HighPass -> DeEsser -> LowShelf -> [RNNoise -> RNNoiseGain] -> Compressor -> Gain -> Analyser -> Destination
   */
  async processStream(inputStream: MediaStream): Promise<MediaStream> {
    if (!this.audioContext) {
      // Fix #3 — pin to 48 kHz interactive context. Mismatching the OS default
      // (often 44.1 kHz) produced the metallic resampling artifacts.
      this.audioContext = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);

    let lastNode: AudioNode = this.sourceNode;

    // High-pass filter (removes low frequency rumble)
    if (this.config.enableHighPass) {
      this.highPassFilter = this.audioContext.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.value = this.config.highPassFrequency;
      this.highPassFilter.Q.value = 0.7;
      lastNode.connect(this.highPassFilter);
      lastNode = this.highPassFilter;
    }

    // De-esser filter (attenuate sibilance around 5-8kHz)
    this.deEsserFilter = this.audioContext.createBiquadFilter();
    this.deEsserFilter.type = 'peaking';
    this.deEsserFilter.frequency.value = 6500;
    this.deEsserFilter.Q.value = 2.0;
    this.deEsserFilter.gain.value = -4;
    lastNode.connect(this.deEsserFilter);
    lastNode = this.deEsserFilter;

    // Low-shelf boost for voice warmth (+2dB at 200Hz)
    this.lowShelfFilter = this.audioContext.createBiquadFilter();
    this.lowShelfFilter.type = 'lowshelf';
    this.lowShelfFilter.frequency.value = 200;
    this.lowShelfFilter.gain.value = 2;
    lastNode.connect(this.lowShelfFilter);
    lastNode = this.lowShelfFilter;

    // Save the tap point *before* RNNoise so we can bypass cleanly (Fix #1).
    this.preRNNoiseTap = lastNode;

    // Always create rnnoiseGainNode so the bypass path has a stable shape.
    this.rnnoiseGainNode = this.audioContext.createGain();

    if (this.config.noiseSuppression !== 'off' && this.config.enableRNNoise) {
      const loaded = await this.loadRNNoise(this.audioContext);
      if (loaded) {
        try {
          this.rnnoiseNode = new AudioWorkletNode(this.audioContext, NoiseSuppressorWorklet_Name);
          this.preRNNoiseTap.connect(this.rnnoiseNode);
          this.rnnoiseNode.connect(this.rnnoiseGainNode);
          this.rnnoiseGainNode.gain.value = this.config.noiseSuppression === 'low' ? 0.85 : 1.0;
          this.rnnoiseBypassed = false;
          console.log('[AudioProcessor] RNNoise noise suppression active, mode:', this.config.noiseSuppression);
        } catch (error) {
          console.warn('[AudioProcessor] Failed to create RNNoise node:', error);
          this.preRNNoiseTap.connect(this.rnnoiseGainNode);
          this.rnnoiseGainNode.gain.value = 1;
          this.rnnoiseBypassed = true;
        }
      } else {
        this.preRNNoiseTap.connect(this.rnnoiseGainNode);
        this.rnnoiseGainNode.gain.value = 1;
        this.rnnoiseBypassed = true;
      }
    } else {
      // Mode 'off' — straight dry path through rnnoiseGainNode at unity gain.
      this.preRNNoiseTap.connect(this.rnnoiseGainNode);
      this.rnnoiseGainNode.gain.value = 1;
      this.rnnoiseBypassed = true;
    }
    lastNode = this.rnnoiseGainNode;

    // Dynamic compressor
    if (this.config.enableCompression) {
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      this.compressorNode.threshold.value = this.config.compressionThreshold;
      this.compressorNode.ratio.value = this.config.compressionRatio;
      this.compressorNode.knee.value = 6;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.1;
      lastNode.connect(this.compressorNode);
      lastNode = this.compressorNode;
    }

    // Mic volume gain (user controlled, 0..2). Independent of the noise gate.
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;
    lastNode.connect(this.gainNode);
    lastNode = this.gainNode;

    // Analyser for spectral VAD — Fix A: tapped BEFORE the noise gate so the
    // VAD never reads its own attenuated output. Previously placed downstream
    // of gateGainNode, which created a self-locking loop: once the gate closed
    // after a silence, analyser saw 0, VAD never reopened it, and both the
    // local meter and the transmitted signal stayed dead until a full restart.
    // The analyser is a side-chain (not in the transmission path) so it does
    // not need to feed destination.
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 4096;
    this.analyserNode.smoothingTimeConstant = 0.3;
    lastNode.connect(this.analyserNode);

    // Noise gate gain — the VAD opens/closes this without touching mic volume (Fix #2).
    this.gateGainNode = this.audioContext.createGain();
    this.gateGainNode.gain.value = 1;
    lastNode.connect(this.gateGainNode);
    lastNode = this.gateGainNode;

    // Destination — fed by the post-gate node so peers receive gated audio.
    this.destinationNode = this.audioContext.createMediaStreamDestination();
    lastNode.connect(this.destinationNode);

    this.processedStream = this.destinationNode.stream;

    console.log('[AudioProcessor] Processing chain created (RNNoise:', this.rnnoiseNode ? 'ON' : 'OFF', ', NS mode:', this.config.noiseSuppression, ')');
    return this.processedStream;
  }

  /**
   * Set noise suppression mode at runtime without recreating the stream
   */
  setNoiseSuppression(mode: NoiseSuppressonMode): void {
    this.config.noiseSuppression = mode;

    // Fix #1 — bypass RNNoise cleanly instead of zeroing its output gain
    // (which previously muted the mic entirely when set to "off").
    if (this.audioContext && this.rnnoiseGainNode && this.preRNNoiseTap) {
      if (mode === 'off') {
        if (!this.rnnoiseBypassed) {
          try { this.rnnoiseNode?.disconnect(this.rnnoiseGainNode); } catch { /* already */ }
          try { this.preRNNoiseTap.connect(this.rnnoiseGainNode); } catch { /* already */ }
          this.rnnoiseBypassed = true;
        }
        this.rnnoiseGainNode.gain.value = 1;
      } else {
        // Re-enable RNNoise (lazy-create if it wasn't built at init).
        if (this.rnnoiseBypassed) {
          try { this.preRNNoiseTap.disconnect(this.rnnoiseGainNode); } catch { /* already */ }
          if (!this.rnnoiseNode && this.rnnoiseLoaded) {
            try {
              this.rnnoiseNode = new AudioWorkletNode(this.audioContext, NoiseSuppressorWorklet_Name);
            } catch (e) {
              console.warn('[AudioProcessor] Could not lazy-create RNNoise:', e);
            }
          }
          if (this.rnnoiseNode) {
            try { this.preRNNoiseTap.connect(this.rnnoiseNode); } catch { /* already */ }
            try { this.rnnoiseNode.connect(this.rnnoiseGainNode); } catch { /* already */ }
            this.rnnoiseBypassed = false;
          } else {
            // RNNoise unavailable — fall back to dry path
            try { this.preRNNoiseTap.connect(this.rnnoiseGainNode); } catch {}
            this.rnnoiseBypassed = true;
          }
        }
        this.rnnoiseGainNode.gain.value = mode === 'low' ? 0.85 : 1.0;
      }
    }

    console.log('[AudioProcessor] Noise suppression set to:', mode);
  }

  /**
   * Set VAD sensitivity
   */
  setVADSensitivity(sensitivity: VADSensitivity): void {
    this.config.vadSensitivity = sensitivity;
    console.log('[AudioProcessor] VAD sensitivity set to:', sensitivity);
  }

  /**
   * Get current audio level (0-1) — RMS of frequency data
   */
  getAudioLevel(): number {
    if (!this.analyserNode) return 0;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const value = dataArray[i] / 255;
      sum += value * value;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * Get raw frequency data for visualization
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0);
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Compute a "voice score" (0-1) using spectral analysis with exponential weighting.
   */
  private computeSpectralVoiceScore(): number {
    if (!this.analyserNode || !this.audioContext) return 0;

    const sampleRate = this.audioContext.sampleRate;
    const binCount = this.analyserNode.frequencyBinCount;
    const freqResolution = sampleRate / (binCount * 2);

    const dataArray = new Uint8Array(binCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    const voiceLowBin = Math.floor(VOICE_FREQ_LOW / freqResolution);
    const voiceHighBin = Math.ceil(VOICE_FREQ_HIGH / freqResolution);
    const formantLowBin = Math.floor(FORMANT_FREQ_LOW / freqResolution);
    const formantHighBin = Math.ceil(FORMANT_FREQ_HIGH / freqResolution);

    let voiceEnergy = 0;
    let formantEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < binCount; i++) {
      const energy = (dataArray[i] / 255) ** 2;
      totalEnergy += energy;

      if (i >= voiceLowBin && i <= voiceHighBin) {
        voiceEnergy += energy;
      }
      if (i >= formantLowBin && i <= formantHighBin) {
        formantEnergy += energy;
      }
    }

    if (totalEnergy < 0.001) return 0;

    const fundamentalRatio = voiceEnergy / totalEnergy;
    const formantRatio = formantEnergy / totalEnergy;

    const normalizedFundamental = Math.min(1, fundamentalRatio / 0.2);
    const normalizedFormant = Math.min(1, formantRatio / 0.6);

    const rawScore = normalizedFundamental * 0.4 + normalizedFormant * 0.6;

    // Exponential weighted smoothing (recent samples count more)
    this.spectralHistory.push(rawScore);
    if (this.spectralHistory.length > this.SPECTRAL_HISTORY_SIZE) {
      this.spectralHistory.shift();
    }

    let weightedSum = 0;
    let weightTotal = 0;
    for (let i = 0; i < this.spectralHistory.length; i++) {
      const weight = Math.pow(1.5, i); // Exponential: newer samples weighted more
      weightedSum += this.spectralHistory[i] * weight;
      weightTotal += weight;
    }
    const smoothedScore = weightedSum / weightTotal;

    return Math.min(1, smoothedScore);
  }

  /**
   * Update ambient noise level for adaptive VAD
   */
  updateAmbientNoise(level: number): void {
    this.ambientSamples.push(level);
    
    if (this.ambientSamples.length > this.AMBIENT_SAMPLE_SIZE) {
      this.ambientSamples.shift();
    }

    const sorted = [...this.ambientSamples].sort((a, b) => a - b);
    const percentileIndex = Math.floor(sorted.length * 0.2);
    this.ambientNoiseLevel = sorted[percentileIndex] || 0.05;
  }

  /**
   * Get adaptive VAD state combining spectral analysis + adaptive threshold + hysteresis
   */
  getVADState(): VADState {
    const level = this.getAudioLevel();
    const spectralVoiceScore = this.computeSpectralVoiceScore();
    
    this.updateAmbientNoise(level);

    const adaptiveThreshold = Math.max(
      0.04,
      Math.min(0.15, this.ambientNoiseLevel + 0.06)
    );

    const preset = VAD_PRESETS[this.config.vadSensitivity];
    const speakStartThreshold = adaptiveThreshold * 1.2;
    const speakStopThreshold = adaptiveThreshold * 0.7;
    const spectralSpeakThreshold = preset.spectralSpeak;
    const spectralStopThreshold = preset.spectralStop;

    let isSpeaking = this.speakingState;

    const levelAboveStart = level > speakStartThreshold;
    const levelAboveStop = level >= speakStopThreshold;
    const spectralIsVoice = spectralVoiceScore > spectralSpeakThreshold;
    const spectralStillVoice = spectralVoiceScore > spectralStopThreshold;

    if (!this.speakingState && levelAboveStart && spectralIsVoice) {
      isSpeaking = true;
      this.speakingState = true;
      
      if (this.speakingHoldTimer) {
        clearTimeout(this.speakingHoldTimer);
        this.speakingHoldTimer = null;
      }
    } else if (this.speakingState && (!levelAboveStop || !spectralStillVoice)) {
      if (!this.speakingHoldTimer) {
        this.speakingHoldTimer = setTimeout(() => {
          this.speakingState = false;
          this.speakingHoldTimer = null;
        }, preset.holdMs);
      }
    } else if (this.speakingState && levelAboveStop && spectralStillVoice) {
      if (this.speakingHoldTimer) {
        clearTimeout(this.speakingHoldTimer);
        this.speakingHoldTimer = null;
      }
    }

    return {
      isSpeaking,
      level,
      adaptiveThreshold,
      spectralVoiceScore,
    };
  }

  /**
   * Fix #2 — actually gate the *transmitted* signal via the dedicated
   * gateGainNode. Threshold scales with VAD sensitivity: high sensitivity
   * opens the gate for quieter sounds, low sensitivity demands more volume.
   */
  applyNoiseGate(level: number): void {
    if (!this.gateGainNode || !this.audioContext || !this.config.enableNoiseGate) return;

    const sensitivityOffset: Record<VADSensitivity, number> = {
      low: 0.08,
      medium: 0.05,
      high: 0.02,
    };
    const threshold = this.ambientNoiseLevel + sensitivityOffset[this.config.vadSensitivity];
    const shouldOpen = level > threshold;
    const now = this.audioContext.currentTime;

    if (shouldOpen && !this.isGateOpen) {
      this.isGateOpen = true;
      this.gateGainNode.gain.cancelScheduledValues(now);
      this.gateGainNode.gain.setValueAtTime(this.gateGainNode.gain.value, now);
      this.gateGainNode.gain.linearRampToValueAtTime(
        1,
        now + this.config.noiseGateAttack / 1000
      );
      if (this.gateHoldTimer) {
        clearTimeout(this.gateHoldTimer);
        this.gateHoldTimer = null;
      }
    } else if (!shouldOpen && this.isGateOpen) {
      if (!this.gateHoldTimer) {
        this.gateHoldTimer = setTimeout(() => {
          this.isGateOpen = false;
          if (!this.gateGainNode || !this.audioContext) return;
          const t = this.audioContext.currentTime;
          this.gateGainNode.gain.cancelScheduledValues(t);
          this.gateGainNode.gain.setValueAtTime(this.gateGainNode.gain.value, t);
          this.gateGainNode.gain.linearRampToValueAtTime(
            0,
            t + this.config.noiseGateRelease / 1000
          );
          this.gateHoldTimer = null;
        }, 100);
      }
    }
  }

  /**
   * Check if RNNoise is active
   */
  isRNNoiseActive(): boolean {
    return this.rnnoiseNode !== null && this.config.noiseSuppression !== 'off';
  }

  /**
   * Toggle RNNoise on/off at runtime
   */
  setRNNoiseEnabled(enabled: boolean): void {
    this.config.enableRNNoise = enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.highPassFilter && this.config.enableHighPass) {
      this.highPassFilter.frequency.value = this.config.highPassFrequency;
    }
    
    if (this.compressorNode && this.config.enableCompression) {
      this.compressorNode.threshold.value = this.config.compressionThreshold;
      this.compressorNode.ratio.value = this.config.compressionRatio;
    }

    if (newConfig.noiseSuppression !== undefined) {
      this.setNoiseSuppression(newConfig.noiseSuppression);
    }

    if (newConfig.vadSensitivity !== undefined) {
      this.setVADSensitivity(newConfig.vadSensitivity);
    }
  }

  /**
   * Set input gain (mic volume). Maps 0-200 to 0.0-2.0 gain value.
   */
  setInputGain(volume: number): void {
    if (this.gainNode && this.audioContext) {
      const gain = Math.max(0, Math.min(2, volume / 100));
      this.gainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01);
      console.log('[AudioProcessor] Input gain set to:', gain);
    }
  }

  /**
   * Set de-esser filter enabled/disabled at runtime
   */
  setDeEsserEnabled(enabled: boolean): void {
    if (this.deEsserFilter) {
      this.deEsserFilter.gain.value = enabled ? -4 : 0;
    }
  }

  /**
   * Set low-shelf boost enabled/disabled at runtime
   */
  setLowShelfEnabled(enabled: boolean): void {
    if (this.lowShelfFilter) {
      this.lowShelfFilter.gain.value = enabled ? 2 : 0;
    }
  }

  /**
   * Set high-pass filter enabled/disabled at runtime
   */
  setHighPassEnabled(enabled: boolean): void {
    if (this.highPassFilter) {
      this.highPassFilter.frequency.value = enabled ? this.config.highPassFrequency : 0;
    }
  }

  /**
   * Get current noise suppression mode
   */
  getNoiseSuppressionMode(): NoiseSuppressonMode {
    return this.config.noiseSuppression;
  }

  /**
   * Get the processed output stream
   */
  getProcessedStream(): MediaStream | null {
    return this.processedStream;
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    if (this.gateHoldTimer) {
      clearTimeout(this.gateHoldTimer);
      this.gateHoldTimer = null;
    }
    
    if (this.speakingHoldTimer) {
      clearTimeout(this.speakingHoldTimer);
      this.speakingHoldTimer = null;
    }

    this.sourceNode?.disconnect();
    this.highPassFilter?.disconnect();
    this.deEsserFilter?.disconnect();
    this.lowShelfFilter?.disconnect();
    this.rnnoiseNode?.disconnect();
    this.rnnoiseGainNode?.disconnect();
    this.compressorNode?.disconnect();
    this.gainNode?.disconnect();
    this.gateGainNode?.disconnect();
    this.analyserNode?.disconnect();

    this.sourceNode = null;
    this.highPassFilter = null;
    this.deEsserFilter = null;
    this.lowShelfFilter = null;
    this.rnnoiseNode = null;
    this.rnnoiseGainNode = null;
    this.preRNNoiseTap = null;
    this.rnnoiseBypassed = false;
    this.compressorNode = null;
    this.gainNode = null;
    this.gateGainNode = null;
    this.analyserNode = null;
    this.destinationNode = null;
    this.processedStream = null;

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Fix B — the AudioWorklet module is bound to the AudioContext we just
    // closed. The next processStream() opens a brand-new context that has
    // no worklets registered, so loadRNNoise() must re-run addModule().
    // Without this reset, the `if (this.rnnoiseLoaded) return true` short-
    // circuit silently skipped addModule and the AudioWorkletNode constructor
    // threw "Unknown AudioWorklet name 'NoiseSuppressorWorklet'" on every
    // device switch, dropping RNNoise into bypass until a full page reload.
    this.rnnoiseLoaded = false;

    this.ambientSamples = [];
    this.ambientNoiseLevel = 0.05;
    this.spectralHistory = [];
    this.isGateOpen = false;
    this.speakingState = false;

    console.log('[AudioProcessor] Cleaned up');
  }
}

// Singleton instance for consistent processing
export const audioProcessor = new AudioProcessor();
