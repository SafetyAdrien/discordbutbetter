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
  private gainNode: GainNode | null = null;
  private rnnoiseGainNode: GainNode | null = null;
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
   * Load the RNNoise AudioWorklet module
   */
  private async loadRNNoise(ctx: AudioContext): Promise<boolean> {
    if (this.rnnoiseLoaded) return true;
    
    try {
      const workletUrl = new URL(
        '@timephy/rnnoise-wasm/NoiseSuppressorWorklet',
        import.meta.url
      ).href;
      
      await ctx.audioWorklet.addModule(workletUrl);
      this.rnnoiseLoaded = true;
      this.rnnoiseAvailable = true;
      console.log('[AudioProcessor] RNNoise WASM worklet loaded successfully');
      return true;
    } catch (error) {
      console.warn('[AudioProcessor] Failed to load RNNoise worklet, falling back to native suppression:', error);
      try {
        const module = await import('@timephy/rnnoise-wasm/NoiseSuppressorWorklet?worker&url');
        await ctx.audioWorklet.addModule(module.default);
        this.rnnoiseLoaded = true;
        this.rnnoiseAvailable = true;
        console.log('[AudioProcessor] RNNoise WASM worklet loaded (alternate method)');
        return true;
      } catch (err2) {
        console.warn('[AudioProcessor] RNNoise alternate load also failed:', err2);
        this.rnnoiseAvailable = false;
        return false;
      }
    }
  }

  /**
   * Process an audio stream through the audio processing chain
   * Chain: Source -> HighPass -> DeEsser -> LowShelf -> [RNNoise -> RNNoiseGain] -> Compressor -> Gain -> Analyser -> Destination
   */
  async processStream(inputStream: MediaStream): Promise<MediaStream> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 48000 });
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
    this.deEsserFilter.gain.value = -4; // -4dB cut on sibilants
    lastNode.connect(this.deEsserFilter);
    lastNode = this.deEsserFilter;

    // Low-shelf boost for voice warmth (+2dB at 200Hz)
    this.lowShelfFilter = this.audioContext.createBiquadFilter();
    this.lowShelfFilter.type = 'lowshelf';
    this.lowShelfFilter.frequency.value = 200;
    this.lowShelfFilter.gain.value = 2;
    lastNode.connect(this.lowShelfFilter);
    lastNode = this.lowShelfFilter;

    // RNNoise ML noise suppression (Krisp-like)
    if (this.config.noiseSuppression !== 'off' && this.config.enableRNNoise) {
      const loaded = await this.loadRNNoise(this.audioContext);
      if (loaded) {
        try {
          this.rnnoiseNode = new AudioWorkletNode(this.audioContext, NoiseSuppressorWorklet_Name);
          lastNode.connect(this.rnnoiseNode);
          lastNode = this.rnnoiseNode;

          // RNNoise output gain (for low vs high mode)
          this.rnnoiseGainNode = this.audioContext.createGain();
          this.rnnoiseGainNode.gain.value = this.config.noiseSuppression === 'low' ? 0.85 : 1.0;
          lastNode.connect(this.rnnoiseGainNode);
          lastNode = this.rnnoiseGainNode;

          console.log('[AudioProcessor] RNNoise noise suppression active, mode:', this.config.noiseSuppression);
        } catch (error) {
          console.warn('[AudioProcessor] Failed to create RNNoise node:', error);
        }
      }
    }

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

    // Gain node (for noise gate control)
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;
    lastNode.connect(this.gainNode);
    lastNode = this.gainNode;

    // Analyser for spectral VAD — larger FFT for better frequency resolution
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 4096; // 2048 frequency bins, ~11.7Hz resolution at 48kHz
    this.analyserNode.smoothingTimeConstant = 0.3;
    lastNode.connect(this.analyserNode);

    // Destination
    this.destinationNode = this.audioContext.createMediaStreamDestination();
    this.analyserNode.connect(this.destinationNode);

    this.processedStream = this.destinationNode.stream;

    console.log('[AudioProcessor] Processing chain created (RNNoise:', this.rnnoiseNode ? 'ON' : 'OFF', ', NS mode:', this.config.noiseSuppression, ')');
    return this.processedStream;
  }

  /**
   * Set noise suppression mode at runtime without recreating the stream
   */
  setNoiseSuppression(mode: NoiseSuppressonMode): void {
    this.config.noiseSuppression = mode;

    if (this.rnnoiseNode && this.rnnoiseGainNode) {
      if (mode === 'off') {
        // Bypass: set RNNoise output gain to 0 and connect source directly
        // Since we can't easily remove nodes, we disconnect rnnoise output
        this.rnnoiseGainNode.gain.value = 0;
      } else {
        this.rnnoiseGainNode.gain.value = mode === 'low' ? 0.85 : 1.0;
      }
    }

    // For 'high' mode, apply more aggressive noise gate threshold
    if (mode === 'high') {
      this.config.noiseGateThreshold = -45;
    } else {
      this.config.noiseGateThreshold = -50;
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
   * Apply noise gate (mute when below threshold)
   */
  applyNoiseGate(level: number): void {
    if (!this.gainNode || !this.config.enableNoiseGate) return;

    const threshold = this.ambientNoiseLevel + 0.05;
    const shouldOpen = level > threshold;

    if (shouldOpen && !this.isGateOpen) {
      this.isGateOpen = true;
      this.gainNode.gain.cancelScheduledValues(this.audioContext!.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(
        1,
        this.audioContext!.currentTime + this.config.noiseGateAttack / 1000
      );
      
      if (this.gateHoldTimer) {
        clearTimeout(this.gateHoldTimer);
        this.gateHoldTimer = null;
      }
    } else if (!shouldOpen && this.isGateOpen) {
      if (!this.gateHoldTimer) {
        this.gateHoldTimer = setTimeout(() => {
          this.isGateOpen = false;
          this.gainNode?.gain.cancelScheduledValues(this.audioContext!.currentTime);
          this.gainNode?.gain.linearRampToValueAtTime(
            0,
            this.audioContext!.currentTime + this.config.noiseGateRelease / 1000
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
    this.analyserNode?.disconnect();
    
    this.sourceNode = null;
    this.highPassFilter = null;
    this.deEsserFilter = null;
    this.lowShelfFilter = null;
    this.rnnoiseNode = null;
    this.rnnoiseGainNode = null;
    this.compressorNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.destinationNode = null;
    this.processedStream = null;

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

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
