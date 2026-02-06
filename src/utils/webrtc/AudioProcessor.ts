/**
 * Advanced Audio Processor with noise gate, compression, filtering and adaptive VAD
 * Inspired by Discord's audio processing pipeline
 */

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
}

export interface VADState {
  isSpeaking: boolean;
  level: number;
  adaptiveThreshold: number;
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
};

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private gainNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  
  private config: AudioProcessorConfig;
  private processedStream: MediaStream | null = null;
  
  // Adaptive VAD state
  private ambientNoiseLevel = 0.05;
  private ambientSamples: number[] = [];
  private readonly AMBIENT_SAMPLE_SIZE = 60; // ~3 seconds at 50ms intervals
  private readonly AMBIENT_UPDATE_INTERVAL = 50;
  
  // Noise gate state
  private isGateOpen = false;
  private gateHoldTimer: NodeJS.Timeout | null = null;
  
  // Speaking state with hysteresis
  private speakingState = false;
  private speakingHoldTimer: NodeJS.Timeout | null = null;
  private readonly SPEAKING_HOLD_MS = 200;

  constructor(config: Partial<AudioProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process an audio stream through the audio processing chain
   */
  async processStream(inputStream: MediaStream): Promise<MediaStream> {
    // Create audio context if needed
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ sampleRate: 48000 });
    }

    // Resume if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Create source from input stream
    this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);

    // Create processing chain
    // Source -> HighPass -> Compressor -> Gain -> Analyser -> Destination
    
    let lastNode: AudioNode = this.sourceNode;

    // High-pass filter (removes low frequency rumble)
    if (this.config.enableHighPass) {
      this.highPassFilter = this.audioContext.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.value = this.config.highPassFrequency;
      this.highPassFilter.Q.value = 0.7; // Butterworth response
      lastNode.connect(this.highPassFilter);
      lastNode = this.highPassFilter;
    }

    // Dynamic compressor (normalizes volume, limits peaks)
    if (this.config.enableCompression) {
      this.compressorNode = this.audioContext.createDynamicsCompressor();
      this.compressorNode.threshold.value = this.config.compressionThreshold;
      this.compressorNode.ratio.value = this.config.compressionRatio;
      this.compressorNode.knee.value = 6; // Soft knee
      this.compressorNode.attack.value = 0.003; // 3ms attack
      this.compressorNode.release.value = 0.1; // 100ms release
      lastNode.connect(this.compressorNode);
      lastNode = this.compressorNode;
    }

    // Gain node (for noise gate control)
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;
    lastNode.connect(this.gainNode);
    lastNode = this.gainNode;

    // Analyser for VAD
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.3;
    lastNode.connect(this.analyserNode);

    // Destination (processed output stream)
    this.destinationNode = this.audioContext.createMediaStreamDestination();
    this.analyserNode.connect(this.destinationNode);

    this.processedStream = this.destinationNode.stream;

    console.log('[AudioProcessor] Processing chain created');
    return this.processedStream;
  }

  /**
   * Get current audio level (0-1)
   */
  getAudioLevel(): number {
    if (!this.analyserNode) return 0;

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    // Calculate RMS for more accurate level
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
   * Update ambient noise level for adaptive VAD
   */
  updateAmbientNoise(level: number): void {
    this.ambientSamples.push(level);
    
    if (this.ambientSamples.length > this.AMBIENT_SAMPLE_SIZE) {
      this.ambientSamples.shift();
    }

    // Calculate ambient as the 20th percentile of samples
    // This represents the "quiet" periods
    const sorted = [...this.ambientSamples].sort((a, b) => a - b);
    const percentileIndex = Math.floor(sorted.length * 0.2);
    this.ambientNoiseLevel = sorted[percentileIndex] || 0.05;
  }

  /**
   * Get adaptive VAD state with hysteresis
   */
  getVADState(): VADState {
    const level = this.getAudioLevel();
    
    // Update ambient noise tracking
    this.updateAmbientNoise(level);

    // Calculate adaptive threshold
    // Threshold = ambient level + offset, but clamped
    const adaptiveThreshold = Math.max(
      0.05, // Minimum threshold
      Math.min(0.15, this.ambientNoiseLevel + 0.08)
    );

    // Hysteresis: different thresholds for starting/stopping speaking
    const speakStartThreshold = adaptiveThreshold * 1.3;
    const speakStopThreshold = adaptiveThreshold * 0.8;

    let isSpeaking = this.speakingState;

    if (!this.speakingState && level > speakStartThreshold) {
      // Start speaking
      isSpeaking = true;
      this.speakingState = true;
      
      // Clear any pending hold timer
      if (this.speakingHoldTimer) {
        clearTimeout(this.speakingHoldTimer);
        this.speakingHoldTimer = null;
      }
    } else if (this.speakingState && level < speakStopThreshold) {
      // Below threshold, but hold for a bit before stopping
      if (!this.speakingHoldTimer) {
        this.speakingHoldTimer = setTimeout(() => {
          this.speakingState = false;
          this.speakingHoldTimer = null;
        }, this.SPEAKING_HOLD_MS);
      }
    } else if (this.speakingState && level >= speakStopThreshold) {
      // Back above threshold, cancel hold timer
      if (this.speakingHoldTimer) {
        clearTimeout(this.speakingHoldTimer);
        this.speakingHoldTimer = null;
      }
    }

    return {
      isSpeaking,
      level,
      adaptiveThreshold,
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
      // Open gate with quick attack
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
      // Close gate with slower release (hold first)
      if (!this.gateHoldTimer) {
        this.gateHoldTimer = setTimeout(() => {
          this.isGateOpen = false;
          this.gainNode?.gain.cancelScheduledValues(this.audioContext!.currentTime);
          this.gainNode?.gain.linearRampToValueAtTime(
            0,
            this.audioContext!.currentTime + this.config.noiseGateRelease / 1000
          );
          this.gateHoldTimer = null;
        }, 100); // 100ms hold before release
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Apply changes to existing nodes
    if (this.highPassFilter && this.config.enableHighPass) {
      this.highPassFilter.frequency.value = this.config.highPassFrequency;
    }
    
    if (this.compressorNode && this.config.enableCompression) {
      this.compressorNode.threshold.value = this.config.compressionThreshold;
      this.compressorNode.ratio.value = this.config.compressionRatio;
    }
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
    this.compressorNode?.disconnect();
    this.gainNode?.disconnect();
    this.analyserNode?.disconnect();
    
    this.sourceNode = null;
    this.highPassFilter = null;
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
    this.isGateOpen = false;
    this.speakingState = false;

    console.log('[AudioProcessor] Cleaned up');
  }
}

// Singleton instance for consistent processing
export const audioProcessor = new AudioProcessor();
