import { audioProcessor } from './AudioProcessor';

export type StreamType = 'audio' | 'camera' | 'screen';

export interface StreamInfo {
  stream: MediaStream;
  type: StreamType;
}

export interface ScreenShareOptions {
  quality: 'low' | 'medium' | 'high';
  frameRate: number;
  audio: boolean;
  cursor: 'always' | 'motion' | 'never';
}

interface RemoteAudioContext {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  gainNode: GainNode | null;
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
const SPEAKING_HOLD_MS = 150; // More responsive for remote peers

// Screen share quality presets
const SCREEN_SHARE_PRESETS: Record<ScreenShareOptions['quality'], { width: number; height: number; defaultFps: number; maxBitrate: number }> = {
  low:    { width: 1280, height: 720,  defaultFps: 15, maxBitrate: 1_500_000 },
  medium: { width: 1920, height: 1080, defaultFps: 30, maxBitrate: 3_000_000 },
  high:   { width: 2560, height: 1440, defaultFps: 60, maxBitrate: 5_000_000 },
};

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

  // Last screen share options for encoding params
  private _lastScreenShareOptions: ScreenShareOptions | null = null;

  // AudioProcessor handles RNNoise + spectral VAD for local mic
  private _audioProcessorActive = false;

  // Callbacks for stream updates
  private onRemoteVideoChange: ((peerId: string, stream: MediaStream | null) => void) | null = null;
  private onRemoteScreenChange: ((peerId: string, stream: MediaStream | null) => void) | null = null;
  private onScreenShareEnded: (() => void) | null = null;

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

  get lastScreenShareOptions(): ScreenShareOptions | null {
    return this._lastScreenShareOptions;
  }

  setRemoteStreamCallbacks(
    onVideo: (peerId: string, stream: MediaStream | null) => void,
    onScreen: (peerId: string, stream: MediaStream | null) => void
  ): void {
    this.onRemoteVideoChange = onVideo;
    this.onRemoteScreenChange = onScreen;
  }

  setScreenShareEndedCallback(cb: () => void): void {
    this.onScreenShareEnded = cb;
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
        console.warn('[MediaManager] AudioProcessor failed, using raw stream:', processingError);
        this.localAudioStream = rawStream;
        this._audioProcessorActive = false;
      }

      // Local analyser for backward compat
      await this.initialize();
      if (this.audioContext && this.localAudioStream) {
        const source = this.audioContext.createMediaStreamSource(this.localAudioStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 4096; // Better frequency resolution
        this.analyser.smoothingTimeConstant = 0.3;
        source.connect(this.analyser);
      }

      // Apply current mute state to new tracks
      if (this.isMuted && this.localAudioStream) {
        this.localAudioStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
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
    this.remoteAudioElements.forEach((audio, peerId) => {
      const volume = this.peerVolumes.get(peerId) ?? 100;
      const usesGain = volume > 100;
      if (usesGain) {
        // GainNode path: mute/unmute via gain value
        const ctx = this.remoteAudioContexts.get(peerId);
        if (ctx?.gainNode) {
          ctx.gainNode.gain.value = deafened ? 0 : volume / 100;
        }
      } else {
        audio.muted = deafened;
      }
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

  async startScreenShare(options?: ScreenShareOptions): Promise<MediaStream> {
    const opts = options || { quality: 'medium', frameRate: 30, audio: true, cursor: 'always' };
    this._lastScreenShareOptions = opts;

    const preset = SCREEN_SHARE_PRESETS[opts.quality];

    try {
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: opts.frameRate || preset.defaultFps },
        } as MediaTrackConstraints,
        audio: opts.audio,
      };
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      // Set content hint for text/detail optimization
      const videoTrack = this.localScreenStream.getVideoTracks()[0];
      if (videoTrack) {
        try {
          (videoTrack as any).contentHint = 'detail';
        } catch { /* contentHint not supported */ }

        videoTrack.onended = () => {
          this.stopScreenShare();
          this.onScreenShareEnded?.();
        };
      }

      this._isScreenSharing = true;
      console.log('[MediaManager] Screen share started with quality:', opts.quality, 'fps:', opts.frameRate);
      return this.localScreenStream;
    } catch (error) {
      console.error('[MediaManager] Failed to start screen share:', error);
      throw error;
    }
  }

  /**
   * Get encoding options for screen share based on last used options
   */
  getScreenShareEncodingOptions(): { maxBitrate: number; maxFramerate: number } | null {
    if (!this._lastScreenShareOptions) return null;
    const preset = SCREEN_SHARE_PRESETS[this._lastScreenShareOptions.quality];
    return {
      maxBitrate: preset.maxBitrate,
      maxFramerate: this._lastScreenShareOptions.frameRate || preset.defaultFps,
    };
  }

  stopScreenShare(): void {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => track.stop());
      this.localScreenStream = null;
      this._isScreenSharing = false;
      this._lastScreenShareOptions = null;
    }
  }

  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  // ==================== REMOTE STREAMS ====================

  addRemoteAudioStream(peerId: string, stream: MediaStream): void {
    this.removeRemoteAudioStream(peerId);

    try {
      const audio = document.createElement('audio');
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.muted = this.isDeafened;
      
      // Apply saved volume — clamp native volume to [0,1]
      const savedVolume = this.peerVolumes.get(peerId) ?? 100;
      audio.volume = Math.max(0, Math.min(1, savedVolume / 100));

      // Robust play with retry on autoplay policy block
      const tryPlay = () => {
        audio.play().catch(error => {
          console.warn('[MediaManager] Autoplay blocked for peer:', peerId, error.name);
          const resumeOnInteraction = () => {
            audio.play().catch(e => console.error('[MediaManager] Retry play failed:', e));
            document.removeEventListener('click', resumeOnInteraction);
            document.removeEventListener('keydown', resumeOnInteraction);
            document.removeEventListener('touchstart', resumeOnInteraction);
          };
          document.addEventListener('click', resumeOnInteraction, { once: true });
          document.addEventListener('keydown', resumeOnInteraction, { once: true });
          document.addEventListener('touchstart', resumeOnInteraction, { once: true });
        });
      };
      tryPlay();

      this.remoteAudioElements.set(peerId, audio);

      // Create audio context with GainNode for amplification > 100%
      const context = new AudioContext();
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
        const resumeCtx = () => {
          context.resume().catch(() => {});
          document.removeEventListener('click', resumeCtx);
          document.removeEventListener('keydown', resumeCtx);
        };
        document.addEventListener('click', resumeCtx, { once: true });
        document.addEventListener('keydown', resumeCtx, { once: true });
      }

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);

      // GainNode for amplification beyond 100%
      let gainNode: GainNode | null = null;
      if (savedVolume > 100) {
        gainNode = context.createGain();
        gainNode.gain.value = savedVolume / 100;
        source.connect(gainNode);
        gainNode.connect(context.destination);
        // When using GainNode for amplification, mute the native element
        // and let Web Audio API handle playback
        audio.volume = 0;
        audio.muted = true;
      }

      this.remoteAudioContexts.set(peerId, { context, analyser, source, gainNode });
      this.remoteVADStates.set(peerId, { spectralHistory: [], speakingState: false, holdTimer: null });
      console.log('[MediaManager] Added remote audio for peer:', peerId, 'volume:', savedVolume);
    } catch (error) {
      console.error('[MediaManager] Failed to set up remote audio for peer:', peerId, error);
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
      if (audioContext.gainNode) {
        try { audioContext.gainNode.disconnect(); } catch { /* already disconnected */ }
      }
      audioContext.context.close().catch(() => {});
      this.remoteAudioContexts.delete(peerId);
    }

    const vadState = this.remoteVADStates.get(peerId);
    if (vadState?.holdTimer) {
      clearTimeout(vadState.holdTimer);
    }
    this.remoteVADStates.delete(peerId);
  }

  getRemoteAudioLevel(peerId: string): number {
    const entry = this.remoteAudioContexts.get(peerId);
    if (!entry) return 0;

    const dataArray = new Uint8Array(entry.analyser.frequencyBinCount);
    entry.analyser.getByteFrequencyData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 255;
      sum += v * v;
    }
    return Math.sqrt(sum / dataArray.length);
  }

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

    // Exponential weighted smoothing
    let vad = this.remoteVADStates.get(peerId);
    if (!vad) {
      vad = { spectralHistory: [], speakingState: false, holdTimer: null };
      this.remoteVADStates.set(peerId, vad);
    }
    vad.spectralHistory.push(rawScore);
    if (vad.spectralHistory.length > SPECTRAL_HISTORY_SIZE) {
      vad.spectralHistory.shift();
    }

    let weightedSum = 0;
    let weightTotal = 0;
    for (let i = 0; i < vad.spectralHistory.length; i++) {
      const weight = Math.pow(1.5, i);
      weightedSum += vad.spectralHistory[i] * weight;
      weightTotal += weight;
    }

    return Math.min(1, weightedSum / weightTotal);
  }

  getRemoteVADState(peerId: string, currentSpeaking: boolean, ambientLevel: number): { isSpeaking: boolean; level: number; spectralScore: number } {
    const level = this.getRemoteAudioLevel(peerId);
    const spectralScore = this.getRemoteSpectralVoiceScore(peerId);

    const adaptiveThreshold = Math.max(0.04, Math.min(0.15, ambientLevel + 0.06));
    const speakStartThreshold = adaptiveThreshold * 1.2;
    const speakStopThreshold = adaptiveThreshold * 0.7;

    const levelAboveStart = level > speakStartThreshold;
    const levelAboveStop = level >= speakStopThreshold;
    const spectralIsVoice = spectralScore > 0.25;  // More sensitive
    const spectralStillVoice = spectralScore > 0.12;

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
      isSpeaking = vad.speakingState;
    } else if (vad.speakingState && levelAboveStop && spectralStillVoice) {
      if (vad.holdTimer) {
        clearTimeout(vad.holdTimer);
        vad.holdTimer = null;
      }
    }

    return { isSpeaking, level, spectralScore };
  }

  getLocalVADState() {
    if (this._audioProcessorActive) {
      return audioProcessor.getVADState();
    }
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
    this.peerVolumes.set(peerId, volume);
    
    const audio = this.remoteAudioElements.get(peerId);
    const remoteCtx = this.remoteAudioContexts.get(peerId);

    if (volume <= 100) {
      // Use native audio.volume for 0-100%
      if (audio) {
        audio.volume = Math.max(0, Math.min(1, volume / 100));
        audio.muted = this.isDeafened || volume === 0;
      }
      // Disconnect any existing GainNode amplification
      if (remoteCtx?.gainNode) {
        try {
          remoteCtx.gainNode.disconnect();
        } catch { /* already disconnected */ }
        remoteCtx.gainNode = null;
      }
    } else {
      // For > 100%, use GainNode for amplification
      if (audio) {
        // Mute native element, let Web Audio API handle output
        audio.volume = 0;
        audio.muted = true;
      }
      if (remoteCtx) {
        if (!remoteCtx.gainNode) {
          remoteCtx.gainNode = remoteCtx.context.createGain();
          remoteCtx.source.connect(remoteCtx.gainNode);
          remoteCtx.gainNode.connect(remoteCtx.context.destination);
        }
        remoteCtx.gainNode.gain.value = volume / 100;
      }
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
    this._lastScreenShareOptions = null;
    console.log('[MediaManager] Cleaned up');
  }
}

export const mediaManager = new MediaManager();
