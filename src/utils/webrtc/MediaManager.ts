import { audioProcessor, AudioProcessor } from './AudioProcessor';

export type StreamType = 'audio' | 'camera' | 'screen';

export interface StreamInfo {
  stream: MediaStream;
  type: StreamType;
}

interface RemoteAudioContext {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
}

/** Per-remote-peer spectral VAD state */
interface RemoteSpectralVAD {
  spectralHistory: number[];
  speakingState: boolean;
  holdTimer: NodeJS.Timeout | null;
}

// Vocal frequency constants
const VOICE_FREQ_LOW = 85;
const VOICE_FREQ_HIGH = 300;
const FORMANT_FREQ_LOW = 300;
const FORMANT_FREQ_HIGH = 3400;
const SPECTRAL_HISTORY_SIZE = 4;
const SPEAKING_HOLD_MS = 200;

export class MediaManager {
  private audioContext: AudioContext | null = null;
  private localAudioStream: MediaStream | null = null;
  private localCameraStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private remoteAudioContexts: Map<string, RemoteAudioContext> = new Map();
  private remoteVideoStreams: Map<string, MediaStream> = new Map();
  private remoteScreenStreams: Map<string, MediaStream> = new Map();
  private peerVolumes: Map<string, number> = new Map();
  private remoteVADStates: Map<string, RemoteSpectralVAD> = new Map();
  
  private isMuted = false;
  private isDeafened = false;
  private _hasMicrophoneAccess = false;
  private _isCameraActive = false;
  private _isScreenSharing = false;
  private isPushToTalkMode = false;
  private isPushToTalkActive = false;

  // AudioProcessor handles RNNoise + spectral VAD for local mic
  private _audioProcessorActive = false;

  // Callbacks for stream updates
  private onRemoteVideoChange: ((peerId: string, stream: MediaStream | null) => void) | null = null;
  private onRemoteScreenChange: ((peerId: string, stream: MediaStream | null) => void) | null = null;

  get hasMicrophoneAccess(): boolean {
    return this._hasMicrophoneAccess;
  }

  get isCameraActive(): boolean {
    return this._isCameraActive;
  }

  get isScreenSharing(): boolean {
    return this._isScreenSharing;
  }

  get audioProcessorActive(): boolean {
    return this._audioProcessorActive;
  }

  setRemoteStreamCallbacks(
    onVideo: (peerId: string, stream: MediaStream | null) => void,
    onScreen: (peerId: string, stream: MediaStream | null) => void
  ): void {
    this.onRemoteVideoChange = onVideo;
    this.onRemoteScreenChange = onScreen;
  }

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  // ==================== MICROPHONE (with AudioProcessor / RNNoise) ====================

  async tryStartMicrophone(): Promise<boolean> {
    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
        video: false,
      });

      // Pipe through AudioProcessor (RNNoise + processing chain)
      try {
        const processedStream = await audioProcessor.processStream(rawStream);
        this.localAudioStream = processedStream;
        this._audioProcessorActive = true;
        console.log('[MediaManager] Microphone started with RNNoise processing');
      } catch (processingError) {
        // Fallback to raw stream if AudioProcessor fails
        console.warn('[MediaManager] AudioProcessor failed, using raw stream:', processingError);
        this.localAudioStream = rawStream;
        this._audioProcessorActive = false;
      }

      // The analyser is now inside AudioProcessor; no need for a separate one
      // But keep a local reference for backward compat
      await this.initialize();
      if (this.audioContext && this.localAudioStream) {
        const source = this.audioContext.createMediaStreamSource(this.localAudioStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.3;
        source.connect(this.analyser);
      }

      this._hasMicrophoneAccess = true;
      console.log('[MediaManager] Microphone started successfully');
      return true;
    } catch (error) {
      console.warn('[MediaManager] Failed to start microphone:', error);
      this._hasMicrophoneAccess = false;
      return false;
    }
  }

  async startMicrophone(): Promise<MediaStream> {
    const success = await this.tryStartMicrophone();
    if (!success || !this.localAudioStream) {
      throw new Error('Failed to access microphone');
    }
    return this.localAudioStream;
  }

  stopMicrophone(): void {
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach(track => track.stop());
      this.localAudioStream = null;
      this._hasMicrophoneAccess = false;
      this._audioProcessorActive = false;
      audioProcessor.cleanup();
      console.log('[MediaManager] Microphone stopped');
    }
  }

  getLocalAudioStream(): MediaStream | null {
    return this.localAudioStream;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  setDeafened(deafened: boolean): void {
    this.isDeafened = deafened;
    this.remoteAudioElements.forEach(audio => {
      audio.muted = deafened;
    });
  }

  setPushToTalkMode(enabled: boolean): void {
    this.isPushToTalkMode = enabled;
    
    if (enabled && this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        track.enabled = this.isPushToTalkActive;
      });
    } else if (!enabled && this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
  }

  setPushToTalkActive(active: boolean): void {
    this.isPushToTalkActive = active;
    
    if (this.isPushToTalkMode && this.localAudioStream && !this.isMuted) {
      this.localAudioStream.getAudioTracks().forEach(track => {
        track.enabled = active;
      });
    }
  }

  // ==================== CAMERA ====================

  async startCamera(): Promise<MediaStream> {
    try {
      this.localCameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      this._isCameraActive = true;
      console.log('[MediaManager] Camera started successfully');
      return this.localCameraStream;
    } catch (error) {
      console.error('[MediaManager] Failed to start camera:', error);
      throw error;
    }
  }

  stopCamera(): void {
    if (this.localCameraStream) {
      this.localCameraStream.getTracks().forEach(track => track.stop());
      this.localCameraStream = null;
      this._isCameraActive = false;
    }
  }

  getLocalCameraStream(): MediaStream | null {
    return this.localCameraStream;
  }

  // ==================== SCREEN SHARE ====================

  async startScreenShare(): Promise<MediaStream> {
    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      this.localScreenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      this._isScreenSharing = true;
      console.log('[MediaManager] Screen share started successfully');
      return this.localScreenStream;
    } catch (error) {
      console.error('[MediaManager] Failed to start screen share:', error);
      throw error;
    }
  }

  stopScreenShare(): void {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => track.stop());
      this.localScreenStream = null;
      this._isScreenSharing = false;
    }
  }

  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  // ==================== REMOTE STREAMS ====================

  addRemoteAudioStream(peerId: string, stream: MediaStream): void {
    this.removeRemoteAudioStream(peerId);

    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.muted = this.isDeafened;
    
    const savedVolume = this.peerVolumes.get(peerId);
    if (savedVolume !== undefined) {
      audio.volume = Math.max(0, Math.min(2, savedVolume / 100));
    }

    audio.play().catch(error => {
      console.error('[MediaManager] Failed to play audio for peer:', peerId, error);
    });

    this.remoteAudioElements.set(peerId, audio);

    // Create audio context with larger FFT for spectral VAD
    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024; // 512 bins, ~47Hz resolution at 48kHz — good balance for remote VAD
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      
      this.remoteAudioContexts.set(peerId, { context, analyser, source });
      this.remoteVADStates.set(peerId, { spectralHistory: [], speakingState: false, holdTimer: null });
      console.log('[MediaManager] Added remote audio with spectral VAD for peer:', peerId);
    } catch (error) {
      console.warn('[MediaManager] Failed to create audio analyser for peer:', peerId, error);
    }
  }

  removeRemoteAudioStream(peerId: string): void {
    const audio = this.remoteAudioElements.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.remoteAudioElements.delete(peerId);
    }

    const audioContext = this.remoteAudioContexts.get(peerId);
    if (audioContext) {
      audioContext.source.disconnect();
      audioContext.context.close().catch(() => {});
      this.remoteAudioContexts.delete(peerId);
    }

    const vadState = this.remoteVADStates.get(peerId);
    if (vadState?.holdTimer) {
      clearTimeout(vadState.holdTimer);
    }
    this.remoteVADStates.delete(peerId);
  }

  /**
   * Get raw audio level for a remote peer (0-1)
   */
  getRemoteAudioLevel(peerId: string): number {
    const entry = this.remoteAudioContexts.get(peerId);
    if (!entry) return 0;

    const dataArray = new Uint8Array(entry.analyser.frequencyBinCount);
    entry.analyser.getByteFrequencyData(dataArray);
    
    // RMS instead of simple average for better dynamic range
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 255;
      sum += v * v;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * Compute spectral voice score for a remote peer (0-1)
   * Uses FFT to detect energy in vocal frequency bands vs total energy
   */
  getRemoteSpectralVoiceScore(peerId: string): number {
    const entry = this.remoteAudioContexts.get(peerId);
    if (!entry) return 0;

    const sampleRate = entry.context.sampleRate;
    const binCount = entry.analyser.frequencyBinCount;
    const freqResolution = sampleRate / (binCount * 2);

    const dataArray = new Uint8Array(binCount);
    entry.analyser.getByteFrequencyData(dataArray);

    const voiceLowBin = Math.floor(VOICE_FREQ_LOW / freqResolution);
    const voiceHighBin = Math.ceil(VOICE_FREQ_HIGH / freqResolution);
    const formantLowBin = Math.floor(FORMANT_FREQ_LOW / freqResolution);
    const formantHighBin = Math.min(binCount - 1, Math.ceil(FORMANT_FREQ_HIGH / freqResolution));

    let voiceEnergy = 0;
    let formantEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < binCount; i++) {
      const energy = (dataArray[i] / 255) ** 2;
      totalEnergy += energy;
      if (i >= voiceLowBin && i <= voiceHighBin) voiceEnergy += energy;
      if (i >= formantLowBin && i <= formantHighBin) formantEnergy += energy;
    }

    if (totalEnergy < 0.001) return 0;

    const fundamentalRatio = voiceEnergy / totalEnergy;
    const formantRatio = formantEnergy / totalEnergy;
    const normalizedFundamental = Math.min(1, fundamentalRatio / 0.2);
    const normalizedFormant = Math.min(1, formantRatio / 0.6);
    const rawScore = normalizedFundamental * 0.4 + normalizedFormant * 0.6;

    // Smooth with history
    let vad = this.remoteVADStates.get(peerId);
    if (!vad) {
      vad = { spectralHistory: [], speakingState: false, holdTimer: null };
      this.remoteVADStates.set(peerId, vad);
    }
    vad.spectralHistory.push(rawScore);
    if (vad.spectralHistory.length > SPECTRAL_HISTORY_SIZE) {
      vad.spectralHistory.shift();
    }

    return vad.spectralHistory.reduce((a, b) => a + b, 0) / vad.spectralHistory.length;
  }

  /**
   * Combined VAD for remote peer: level + spectral analysis
   * Returns { isSpeaking, level, spectralScore }
   */
  getRemoteVADState(peerId: string, currentSpeaking: boolean, ambientLevel: number): { isSpeaking: boolean; level: number; spectralScore: number } {
    const level = this.getRemoteAudioLevel(peerId);
    const spectralScore = this.getRemoteSpectralVoiceScore(peerId);

    const adaptiveThreshold = Math.max(0.04, Math.min(0.15, ambientLevel + 0.06));
    const speakStartThreshold = adaptiveThreshold * 1.2;
    const speakStopThreshold = adaptiveThreshold * 0.7;

    const levelAboveStart = level > speakStartThreshold;
    const levelAboveStop = level >= speakStopThreshold;
    const spectralIsVoice = spectralScore > 0.3;
    const spectralStillVoice = spectralScore > 0.15;

    let vad = this.remoteVADStates.get(peerId);
    if (!vad) {
      vad = { spectralHistory: [], speakingState: currentSpeaking, holdTimer: null };
      this.remoteVADStates.set(peerId, vad);
    }

    let isSpeaking = vad.speakingState;

    if (!vad.speakingState && levelAboveStart && spectralIsVoice) {
      isSpeaking = true;
      vad.speakingState = true;
      if (vad.holdTimer) {
        clearTimeout(vad.holdTimer);
        vad.holdTimer = null;
      }
    } else if (vad.speakingState && (!levelAboveStop || !spectralStillVoice)) {
      if (!vad.holdTimer) {
        vad.holdTimer = setTimeout(() => {
          vad!.speakingState = false;
          vad!.holdTimer = null;
        }, SPEAKING_HOLD_MS);
      }
      isSpeaking = vad.speakingState; // Still speaking during hold period
    } else if (vad.speakingState && levelAboveStop && spectralStillVoice) {
      if (vad.holdTimer) {
        clearTimeout(vad.holdTimer);
        vad.holdTimer = null;
      }
    }

    return { isSpeaking, level, spectralScore };
  }

  /**
   * Get local VAD state from AudioProcessor (uses spectral analysis + RNNoise)
   */
  getLocalVADState() {
    if (this._audioProcessorActive) {
      return audioProcessor.getVADState();
    }
    // Fallback: simple level-based
    const level = this.getAudioLevel();
    return { isSpeaking: level > 0.05, level, adaptiveThreshold: 0.05, spectralVoiceScore: 0 };
  }

  addRemoteVideoStream(peerId: string, stream: MediaStream, type: 'camera' | 'screen'): void {
    if (type === 'camera') {
      this.remoteVideoStreams.set(peerId, stream);
      this.onRemoteVideoChange?.(peerId, stream);
    } else {
      this.remoteScreenStreams.set(peerId, stream);
      this.onRemoteScreenChange?.(peerId, stream);
    }
  }

  removeRemoteVideoStream(peerId: string, type: 'camera' | 'screen'): void {
    if (type === 'camera') {
      this.remoteVideoStreams.delete(peerId);
      this.onRemoteVideoChange?.(peerId, null);
    } else {
      this.remoteScreenStreams.delete(peerId);
      this.onRemoteScreenChange?.(peerId, null);
    }
  }

  getRemoteVideoStreams(): Map<string, MediaStream> {
    return new Map(this.remoteVideoStreams);
  }

  getRemoteScreenStreams(): Map<string, MediaStream> {
    return new Map(this.remoteScreenStreams);
  }

  // ==================== AUDIO LEVEL ====================

  getAudioLevel(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 255;
      sum += v * v;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  // ==================== VOLUME CONTROL ====================

  setRemoteAudioVolume(peerId: string, volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(2, volume / 100));
    this.peerVolumes.set(peerId, volume);
    
    const audio = this.remoteAudioElements.get(peerId);
    if (audio) {
      audio.volume = normalizedVolume;
    }
  }

  getRemoteAudioVolume(peerId: string): number {
    return this.peerVolumes.get(peerId) ?? 100;
  }

  // ==================== CLEANUP ====================

  cleanup(): void {
    this.stopMicrophone();
    this.stopCamera();
    this.stopScreenShare();

    this.remoteAudioElements.forEach((audio) => {
      audio.srcObject = null;
      audio.remove();
    });
    this.remoteAudioElements.clear();
    
    this.remoteAudioContexts.forEach((ctx) => {
      ctx.source.disconnect();
      ctx.context.close().catch(() => {});
    });
    this.remoteAudioContexts.clear();

    // Clean up VAD timers
    this.remoteVADStates.forEach(vad => {
      if (vad.holdTimer) clearTimeout(vad.holdTimer);
    });
    this.remoteVADStates.clear();
    
    this.remoteVideoStreams.clear();
    this.remoteScreenStreams.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this._hasMicrophoneAccess = false;
    this._isCameraActive = false;
    this._isScreenSharing = false;
    this._audioProcessorActive = false;
    console.log('[MediaManager] Cleaned up');
  }
}

export const mediaManager = new MediaManager();
