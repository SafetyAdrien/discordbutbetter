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
  
  private isMuted = false;
  private isDeafened = false;
  private _hasMicrophoneAccess = false;
  private _isCameraActive = false;
  private _isScreenSharing = false;
  private isPushToTalkMode = false;
  private isPushToTalkActive = false;

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

  // ==================== MICROPHONE ====================

  async tryStartMicrophone(): Promise<boolean> {
    try {
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          // Note: latency constraint moved to ideal form for compatibility
        },
        video: false,
      });

      await this.initialize();

      if (this.audioContext && this.localAudioStream) {
        const source = this.audioContext.createMediaStreamSource(this.localAudioStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.3; // Smoother VAD
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
    console.log('[MediaManager] Mute set to:', muted);
  }

  setDeafened(deafened: boolean): void {
    this.isDeafened = deafened;
    this.remoteAudioElements.forEach(audio => {
      audio.muted = deafened;
    });
    console.log('[MediaManager] Deafen set to:', deafened);
  }

  setPushToTalkMode(enabled: boolean): void {
    this.isPushToTalkMode = enabled;
    console.log('[MediaManager] Push-to-talk mode:', enabled);
    
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
      console.log('[MediaManager] Camera stopped');
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
        audio: true, // Capture system audio if available
      });

      // Handle user stopping screen share via browser UI
      this.localScreenStream.getVideoTracks()[0].onended = () => {
        console.log('[MediaManager] Screen share ended by user');
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
      console.log('[MediaManager] Screen share stopped');
    }
  }

  getLocalScreenStream(): MediaStream | null {
    return this.localScreenStream;
  }

  // ==================== REMOTE STREAMS ====================

  addRemoteAudioStream(peerId: string, stream: MediaStream): void {
    this.removeRemoteAudioStream(peerId);

    // Create audio element for playback
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.muted = this.isDeafened;
    
    // Apply saved volume if exists
    const savedVolume = this.peerVolumes.get(peerId);
    if (savedVolume !== undefined) {
      audio.volume = Math.max(0, Math.min(2, savedVolume / 100));
    }

    audio.play().catch(error => {
      console.error('[MediaManager] Failed to play audio for peer:', peerId, error);
    });

    this.remoteAudioElements.set(peerId, audio);

    // Create audio context and analyser for VAD (Voice Activity Detection)
    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      this.remoteAudioContexts.set(peerId, { context, analyser, source });
      console.log('[MediaManager] Added remote audio stream with VAD for peer:', peerId);
    } catch (error) {
      console.warn('[MediaManager] Failed to create audio analyser for peer:', peerId, error);
    }
  }

  removeRemoteAudioStream(peerId: string): void {
    // Clean up audio element
    const audio = this.remoteAudioElements.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.remoteAudioElements.delete(peerId);
    }

    // Clean up audio context for VAD
    const audioContext = this.remoteAudioContexts.get(peerId);
    if (audioContext) {
      audioContext.source.disconnect();
      audioContext.context.close().catch(() => {});
      this.remoteAudioContexts.delete(peerId);
    }
    
    console.log('[MediaManager] Removed remote audio stream for peer:', peerId);
  }

  // Get audio level for a remote peer (for VAD)
  getRemoteAudioLevel(peerId: string): number {
    const entry = this.remoteAudioContexts.get(peerId);
    if (!entry) return 0;

    const dataArray = new Uint8Array(entry.analyser.frequencyBinCount);
    entry.analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average / 255;
  }

  addRemoteVideoStream(peerId: string, stream: MediaStream, type: 'camera' | 'screen'): void {
    if (type === 'camera') {
      this.remoteVideoStreams.set(peerId, stream);
      this.onRemoteVideoChange?.(peerId, stream);
    } else {
      this.remoteScreenStreams.set(peerId, stream);
      this.onRemoteScreenChange?.(peerId, stream);
    }
    console.log(`[MediaManager] Added remote ${type} stream for peer:`, peerId);
  }

  removeRemoteVideoStream(peerId: string, type: 'camera' | 'screen'): void {
    if (type === 'camera') {
      this.remoteVideoStreams.delete(peerId);
      this.onRemoteVideoChange?.(peerId, null);
    } else {
      this.remoteScreenStreams.delete(peerId);
      this.onRemoteScreenChange?.(peerId, null);
    }
    console.log(`[MediaManager] Removed remote ${type} stream for peer:`, peerId);
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

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average / 255;
  }

  // ==================== VOLUME CONTROL ====================

  setRemoteAudioVolume(peerId: string, volume: number): void {
    // volume: 0-200 (100 = normal, 200 = 2x amplification)
    const normalizedVolume = Math.max(0, Math.min(2, volume / 100));
    this.peerVolumes.set(peerId, volume);
    
    const audio = this.remoteAudioElements.get(peerId);
    if (audio) {
      audio.volume = normalizedVolume;
    }
    console.log('[MediaManager] Set volume for peer:', peerId, 'to', volume);
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
    
    // Clean up remote audio contexts for VAD
    this.remoteAudioContexts.forEach((ctx) => {
      ctx.source.disconnect();
      ctx.context.close().catch(() => {});
    });
    this.remoteAudioContexts.clear();
    
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
    console.log('[MediaManager] Cleaned up');
  }
}

export const mediaManager = new MediaManager();
