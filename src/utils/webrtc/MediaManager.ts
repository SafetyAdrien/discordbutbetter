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
  /** Hauteur voulue (480 a 2160) : prioritaire sur `quality` quand elle est fournie. */
  height?: number;
  /** Fluidite (mouvement) ou nettete (details) : indice de contenu de la piste video. */
  contentType?: 'smoothness' | 'clarity';
}

interface RemoteAudioContext {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  gainNode: GainNode | null;
  limiterNode: DynamicsCompressorNode | null;
  saturatorNode: WaveShaperNode | null;
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
/**
 * Remote VAD thresholds.
 *
 * These MUST mirror `VAD_PRESETS.medium` in AudioProcessor.ts. The local user is
 * detected by the AudioProcessor and remote peers by this function, and both
 * results end up in the same `speakingUsers` set. When the constants differed
 * (0.24/220 ms vs 0.25/150 ms), the local user's own rings and the rings shown
 * to other people lit up at different moments — the indicators visibly
 * disagreed for the same voice.
 */
/** Same presets as AudioProcessor's VAD_PRESETS, indexed the same way. */
const REMOTE_VAD_PRESETS = {
  low:    { spectralSpeak: 0.34, spectralStop: 0.22, holdMs: 300 },
  medium: { spectralSpeak: 0.24, spectralStop: 0.15, holdMs: 220 },
  high:   { spectralSpeak: 0.18, spectralStop: 0.10, holdMs: 180 },
} as const;

// Screen share quality presets
const SCREEN_SHARE_PRESETS: Record<ScreenShareOptions['quality'], { width: number; height: number; defaultFps: number; maxBitrate: number }> = {
  low:    { width: 1280, height: 720,  defaultFps: 15, maxBitrate: 1_500_000 },
  medium: { width: 1920, height: 1080, defaultFps: 30, maxBitrate: 3_000_000 },
  high:   { width: 2560, height: 1440, defaultFps: 60, maxBitrate: 5_000_000 },
};

/** Reglages de capture : la hauteur choisie (si presente) fixe la taille et le debit. */
function presetFor(o: ScreenShareOptions) {
  if (!o.height) return SCREEN_SHARE_PRESETS[o.quality];
  const fps = o.frameRate || 30;
  // Debit ~ pixels x images/s x 0,05 bit, borne entre 1 et 12 Mb/s.
  const width = Math.round((o.height * 16) / 9);
  const bitrate = Math.min(12_000_000, Math.max(1_000_000, Math.round(width * o.height * fps * 0.05)));
  return { width, height: o.height, defaultFps: fps, maxBitrate: bitrate };
}

export class MediaManager {
  /**
   * Remote VAD sensitivity, kept in sync with the local AudioProcessor setting
   * so that adjusting sensitivity affects local and remote detection equally.
   * Without this, remote speakers stayed on the hardcoded default while the
   * user's own microphone followed the setting.
   */
  private vadSensitivity: keyof typeof REMOTE_VAD_PRESETS = 'medium';

  setVADSensitivity(sensitivity: keyof typeof REMOTE_VAD_PRESETS): void {
    this.vadSensitivity = sensitivity;
  }

  private get remoteVadPreset() {
    return REMOTE_VAD_PRESETS[this.vadSensitivity] ?? REMOTE_VAD_PRESETS.medium;
  }

  private audioContext: AudioContext | null = null;
  private localAudioStream: MediaStream | null = null;
  /**
   * Fix G — durable reference to the raw getUserMedia stream (pre-processing).
   * Needed so stopMicrophone() can release the physical input device even when
   * restartMicrophoneWith() keeps the AudioContext alive across a device swap.
   * Without this, the OS-level mic indicator stayed lit forever after a switch.
   */
  private localRawStream: MediaStream | null = null;
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
      // Fix #3 — standardize at 48 kHz interactive across the app.
      this.audioContext = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
    }
  }

  // ==================== DEVICE SELECTION (Fix #6) ====================

  /** Persisted input device id (default 'default'). */
  private _inputDeviceId: string = (() => {
    try { return localStorage.getItem('voice-input-device') || 'default'; } catch { return 'default'; }
  })();
  /** Persisted output device id (default 'default'). */
  private _outputDeviceId: string = (() => {
    try { return localStorage.getItem('voice-output-device') || 'default'; } catch { return 'default'; }
  })();

  getInputDeviceId(): string { return this._inputDeviceId; }
  getOutputDeviceId(): string { return this._outputDeviceId; }

  /** Update the stored input id. The active mic must be restarted to apply. */
  setInputDeviceId(deviceId: string): void {
    this._inputDeviceId = deviceId || 'default';
    try { localStorage.setItem('voice-input-device', this._inputDeviceId); } catch {}
  }

  /** True when native <audio> elements can route to a specific sink. */
  canRouteNativeAudioToDevice(): boolean {
    try {
      return typeof HTMLMediaElement !== 'undefined' &&
        'setSinkId' in HTMLMediaElement.prototype;
    } catch { return false; }
  }

  /**
   * True when the Web Audio chain can route to a specific sink, either via
   * AudioContext.prototype.setSinkId (Chromium 110+) OR via the constructor
   * fallback `new AudioContext({ sinkId })` (some Chromium variants ship one
   * without the other).
   */
  canRouteWebAudioToDevice(): boolean {
    if (typeof AudioContext === 'undefined') return false;
    try {
      // @ts-ignore — Chrome 110+ method form
      if (typeof (AudioContext.prototype as any).setSinkId === 'function') return true;
    } catch {}
    // Constructor probe (one-shot, memoized).
    if (MediaManager._ctorSinkProbe === null) {
      try {
        const probe = new AudioContext({ sinkId: '' } as AudioContextOptions & { sinkId: string });
        MediaManager._ctorSinkProbe = true;
        probe.close().catch(() => {});
      } catch { MediaManager._ctorSinkProbe = false; }
    }
    return MediaManager._ctorSinkProbe === true;
  }
  private static _ctorSinkProbe: boolean | null = null;

  /** Apply an output sink to every active remote audio path. */
  async setOutputSinkId(deviceId: string): Promise<void> {
    this._outputDeviceId = deviceId || 'default';
    try { localStorage.setItem('voice-output-device', this._outputDeviceId); } catch {}

    // Path 1 — native <audio> elements (supported in Chromium for years).
    for (const audio of this.remoteAudioElements.values()) {
      if (typeof (audio as any).setSinkId === 'function') {
        try { await (audio as any).setSinkId(this._outputDeviceId); }
        catch (e) { console.warn('[MediaManager] <audio>.setSinkId failed:', e); }
      }
    }

    // Path 2 — AudioContext (high-gain chain).
    // 2a — Chromium 110+ method form.
    const hasMethod =
      typeof AudioContext !== 'undefined' &&
      // @ts-ignore
      typeof (AudioContext.prototype as any).setSinkId === 'function';

    if (hasMethod) {
      for (const entry of this.remoteAudioContexts.values()) {
        const ctx: any = entry.context;
        if (typeof ctx.setSinkId === 'function') {
          try { await ctx.setSinkId(this._outputDeviceId); }
          catch (e) { console.warn('[MediaManager] AudioContext.setSinkId failed:', e); }
        }
      }
      return;
    }

    // 2b — Fallback: recreate AudioContext via constructor `{ sinkId }` for
    // peers whose voie 2 (high-gain chain) is actually wired — i.e. gainNode
    // is non-null. Peers without amplification already use voie 1 (native
    // <audio>) which was rerouted above; recreating their context would only
    // perturb the analyser (anneau "qui parle") for no audible benefit.
    if (!this.canRouteWebAudioToDevice()) return;

    for (const [peerId, entry] of this.remoteAudioContexts.entries()) {
      if (!entry.gainNode) continue; // skip non-amplified peers

      const stream = entry.source.mediaStream;
      const savedGain = entry.gainNode.gain.value;
      const oldContext = entry.context;

      let newCtx: AudioContext;
      try {
        newCtx = new AudioContext({
          sinkId: this._outputDeviceId,
          sampleRate: 48000,
          latencyHint: 'interactive',
        } as AudioContextOptions & { sinkId: string });
      } catch (e) {
        console.warn('[MediaManager] AudioContext({sinkId}) recreation failed for peer:', peerId, e);
        continue;
      }

      // Rebuild BOTH branches on the new context: analyser (level meter) +
      // amplification chain. The analyser is mandatory — without it,
      // getRemoteSpeakingLevel() would freeze for this peer after switching sinks.
      const newSource = newCtx.createMediaStreamSource(stream);
      const newAnalyser = newCtx.createAnalyser();
      newAnalyser.fftSize = 2048;                  // identical to L.486
      newAnalyser.smoothingTimeConstant = 0.3;     // identical to L.487
      const newGain = newCtx.createGain();
      newGain.gain.value = savedGain;
      const newLimiter = this._createLimiter(newCtx);
      const newSaturator = this._createSaturator(newCtx);

      newSource.connect(newAnalyser);
      newSource.connect(newGain);
      newGain.connect(newLimiter);
      newLimiter.connect(newSaturator);
      newSaturator.connect(newCtx.destination);

      // Disconnect & close old context.
      try { entry.source.disconnect(); } catch {}
      try { entry.gainNode.disconnect(); } catch {}
      try { entry.limiterNode?.disconnect(); } catch {}
      try { entry.saturatorNode?.disconnect(); } catch {}
      try { await oldContext.close(); } catch {}

      this.remoteAudioContexts.set(peerId, {
        context: newCtx,
        analyser: newAnalyser,
        source: newSource,
        gainNode: newGain,
        limiterNode: newLimiter,
        saturatorNode: newSaturator,
      });
    }
  }

  // ==================== MICROPHONE (with AudioProcessor / RNNoise) ====================

  async tryStartMicrophone(deviceId?: string): Promise<boolean> {
    try {
      // If caller passed an explicit device, persist it before opening the stream.
      if (deviceId) this.setInputDeviceId(deviceId);

      // Fix #4 — disable browser-native NS/AGC because our AudioProcessor chain
      // (RNNoise + de-esser + compressor + custom AGC via DynamicsCompressor)
      // handles those steps. Stacking native + custom DSP produced the
      // "double-processing" artifacts reported during the audit. EC is kept
      // native (browser AEC is high quality and depends on the device).
      const constraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
        channelCount: 1,
      };
      if (this._inputDeviceId && this._inputDeviceId !== 'default') {
        (constraints as any).deviceId = { exact: this._inputDeviceId };
      }

      const rawStream = await navigator.mediaDevices.getUserMedia({ audio: constraints, video: false });
      // Fix G — keep a durable reference to the physical input so we can
      // release the device explicitly on stopMicrophone() even when the
      // processed (output) stream is the one exposed as localAudioStream.
      this.localRawStream = rawStream;

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
        this.analyser.fftSize = 4096;
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
      console.log('[MediaManager] Microphone started successfully (device:', this._inputDeviceId, ')');
      return true;
    } catch (error) {
      console.warn('[MediaManager] Failed to start microphone:', error);
      this._hasMicrophoneAccess = false;
      return false;
    }
  }

  /**
   * Restart the microphone on a new input device, returning the new processed track.
   * Used by useWebRTC.switchInputDevice to hot-swap senders without renegotiation.
   */
  /**
   * Restart the microphone on a new input device, returning the new processed track.
   * Used by useWebRTC.switchInputDevice to hot-swap senders without renegotiation.
   *
   * Fix G — does NOT call stopMicrophone() (which would close the AudioContext
   * and trigger a full RNNoise WASM reload). Instead we open the new raw
   * stream, ask the AudioProcessor to swap *only* the source node, then stop
   * the old raw tracks AFTER the new ones are wired (no audible gap).
   */
  async restartMicrophoneWith(deviceId: string): Promise<MediaStreamTrack | null> {
    try {
      this.setInputDeviceId(deviceId);

      const constraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
        channelCount: 1,
      };
      if (this._inputDeviceId && this._inputDeviceId !== 'default') {
        (constraints as any).deviceId = { exact: this._inputDeviceId };
      }

      const newRawStream = await navigator.mediaDevices.getUserMedia({ audio: constraints, video: false });

      let newProcessedStream: MediaStream;
      if (this._audioProcessorActive) {
        // Hot-swap into the existing chain — no context close, no WASM reload.
        newProcessedStream = await audioProcessor.swapInputStream(newRawStream);
      } else {
        // Processor wasn't running (fallback path). Try to bring it up now.
        try {
          newProcessedStream = await audioProcessor.processStream(newRawStream);
          this._audioProcessorActive = true;
        } catch (processingError) {
          console.warn('[MediaManager] AudioProcessor failed during switch, using raw stream:', processingError);
          newProcessedStream = newRawStream;
          this._audioProcessorActive = false;
        }
      }

      // Only NOW stop the old raw tracks — switching first avoids an audible gap.
      const oldRaw = this.localRawStream;
      this.localRawStream = newRawStream;
      this.localAudioStream = newProcessedStream;
      if (oldRaw) {
        oldRaw.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      }

      // Rebuild the local analyser on the new processed stream — same fix
      // class as the remote-output analyser that froze after a sink switch.
      await this.initialize();
      if (this.audioContext && this.localAudioStream) {
        try { this.analyser?.disconnect(); } catch {}
        const source = this.audioContext.createMediaStreamSource(this.localAudioStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 4096;
        this.analyser.smoothingTimeConstant = 0.3;
        source.connect(this.analyser);
      }

      // Reapply mute state to the new tracks.
      if (this.isMuted) {
        this.localAudioStream.getAudioTracks().forEach((t) => { t.enabled = false; });
      }

      this._hasMicrophoneAccess = true;
      console.log('[MediaManager] Microphone hot-swapped to device:', this._inputDeviceId);
      return this.localAudioStream.getAudioTracks()[0] || null;
    } catch (error) {
      // Keep the previous mic active rather than tearing everything down.
      console.warn('[MediaManager] restartMicrophoneWith failed, keeping previous mic:', error);
      return null;
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
    // Fix G — release the physical input device. localAudioStream is the
    // processed (destination) stream; stopping its tracks does NOT free the
    // underlying mic. Without this, the OS mic indicator would stay lit after
    // a voice disconnect once hot-swap stopped closing the AudioContext.
    if (this.localRawStream) {
      this.localRawStream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      this.localRawStream = null;
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

    const preset = presetFor(opts);

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
          (videoTrack as any).contentHint = opts.contentType === 'smoothness' ? 'motion' : 'detail';
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
    const preset = presetFor(this._lastScreenShareOptions);
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

      // Fix #6 — route this element to the persisted output device.
      if (this._outputDeviceId && this._outputDeviceId !== 'default' &&
          typeof (audio as any).setSinkId === 'function') {
        (audio as any).setSinkId(this._outputDeviceId).catch((e: unknown) =>
          console.warn('[MediaManager] initial setSinkId failed:', e));
      }

      // Apply saved volume — clamp native volume to [0,1] (master applied below)
      const savedVolume = this.peerVolumes.get(peerId) ?? 100;
      this.peerVolumes.set(peerId, savedVolume);
      audio.volume = Math.max(0, Math.min(1, (savedVolume / 100) * this._masterOutputVolume));

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

      // Fix #3 — 48 kHz interactive context to match the encoder rate and
      // avoid the metallic resampling artifacts heard previously.
      const context = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
      // Fix #6 — route the high-gain Web Audio chain to the chosen sink when supported.
      if (this._outputDeviceId && this._outputDeviceId !== 'default' &&
          typeof (context as any).setSinkId === 'function') {
        (context as any).setSinkId(this._outputDeviceId).catch((e: unknown) =>
          console.warn('[MediaManager] AudioContext.setSinkId failed:', e));
      }
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
      // Same reasoning as AudioProcessor: this analyser feeds the remote
      // speaking indicator, so smoothing directly delays the visual response.
      // 0.1 reacts within a poll; the hold timer absorbs the resulting jitter.
      analyser.smoothingTimeConstant = 0.1;
      source.connect(analyser);

      // GainNode + brick-wall limiter + tanh saturator for amplification > 100%
      // Chain: source -> gain -> limiter -> saturator -> destination.
      // The saturator (WaveShaperNode, tanh, oversample 4x) guarantees the
      // final peak stays <= ~0.95 even if the limiter transient slips through.
      let gainNode: GainNode | null = null;
      let limiterNode: DynamicsCompressorNode | null = null;
      let saturatorNode: WaveShaperNode | null = null;
      const effective = (savedVolume / 100) * this._masterOutputVolume;
      if (effective > 1) {
        gainNode = context.createGain();
        gainNode.gain.value = effective;
        limiterNode = this._createLimiter(context);
        saturatorNode = this._createSaturator(context);
        source.connect(gainNode);
        gainNode.connect(limiterNode);
        limiterNode.connect(saturatorNode);
        saturatorNode.connect(context.destination);
        // When using GainNode for amplification, mute the native element
        audio.volume = 0;
        audio.muted = true;
      }

      this.remoteAudioContexts.set(peerId, { context, analyser, source, gainNode, limiterNode, saturatorNode });
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
      if (audioContext.limiterNode) {
        try { audioContext.limiterNode.disconnect(); } catch { /* already disconnected */ }
      }
      if (audioContext.saturatorNode) {
        try { audioContext.saturatorNode.disconnect(); } catch { /* already disconnected */ }
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

  /**
   * Create a brick-wall limiter (DynamicsCompressor at 20:1 with -1dB threshold).
   * Used downstream of the per-peer gainNode to prevent clipping when the
   * effective volume exceeds 1.0 (peerVolume * masterVolume can reach 4.0).
   * No make-up gain → strictly limits output, no double-gain risk.
   */
  private _createLimiter(context: AudioContext): DynamicsCompressorNode {
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -1;   // dB — just below 0dBFS
    limiter.knee.value = 0;          // hard knee for brick-wall behavior
    limiter.ratio.value = 20;        // 20:1 ≈ limiter
    limiter.attack.value = 0.003;    // 3 ms — catch transients fast
    limiter.release.value = 0.1;     // 100 ms — natural decay
    return limiter;
  }

  /**
   * Create a tanh saturator (WaveShaperNode, oversample 4x) clamped at ±0.95.
   * Placed AFTER the limiter as a final safety net: catches residual transient
   * overshoots that slip through the 3 ms attack, guaranteeing peak <= ~0.95.
   * 4x oversampling reduces aliasing introduced by the non-linearity.
   */
  private _createSaturator(context: AudioContext): WaveShaperNode {
    const shaper = context.createWaveShaper();
    const N = 4096;
    const curve = new Float32Array(N);
    const CLAMP = 0.95;
    // y = CLAMP * tanh(x) — at x=±1 gives ~0.72; saturates smoothly above.
    // The curve covers input [-2, +2] which is the maximum the limiter can
    // momentarily emit given gain up to 4.0 and a 3 ms attack window.
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * 4 - 2; // [-2, +2]
      curve[i] = CLAMP * Math.tanh(x);
    }
    shaper.curve = curve;
    shaper.oversample = '4x';
    return shaper;
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
    // Asymmetric smoothing (fast attack, slower release) — mirrors
    // AudioProcessor.computeSpectralVoiceScore. The previous exponential
    // weighting only let the newest sample contribute 38%, so a remote
    // speaker's indicator needed several extra polls to cross the threshold.
    const prev = vad.spectralHistory.length > 0
      ? vad.spectralHistory[vad.spectralHistory.length - 1]
      : 0;
    const alpha = rawScore > prev ? 0.75 : 0.45;
    const smoothed = prev + (rawScore - prev) * alpha;

    vad.spectralHistory.push(smoothed);
    if (vad.spectralHistory.length > SPECTRAL_HISTORY_SIZE) {
      vad.spectralHistory.shift();
    }

    return Math.min(1, smoothed);
  }

  getRemoteVADState(peerId: string, currentSpeaking: boolean, ambientLevel: number): { isSpeaking: boolean; level: number; spectralScore: number } {
    const level = this.getRemoteAudioLevel(peerId);
    const spectralScore = this.getRemoteSpectralVoiceScore(peerId);

    const adaptiveThreshold = Math.max(0.04, Math.min(0.15, ambientLevel + 0.06));
    const speakStartThreshold = adaptiveThreshold * 1.2;
    const speakStopThreshold = adaptiveThreshold * 0.7;

    const levelAboveStart = level > speakStartThreshold;
    const levelAboveStop = level >= speakStopThreshold;
    const preset = this.remoteVadPreset;
    const spectralIsVoice = spectralScore > preset.spectralSpeak;
    const spectralStillVoice = spectralScore > preset.spectralStop;

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
        }, preset.holdMs);
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

  private _masterOutputVolume = (() => {
    try { return Math.max(0, Math.min(2, parseInt(localStorage.getItem('voice-output-volume') || '100', 10) / 100)); }
    catch { return 1; }
  })();

  setMasterOutputVolume(percent: number): void {
    this._masterOutputVolume = Math.max(0, Math.min(2, percent / 100));
    try { localStorage.setItem('voice-output-volume', String(Math.round(this._masterOutputVolume * 100))); } catch {}
    this.peerVolumes.forEach((_, peerId) => this._applyEffectiveVolume(peerId));
    this.remoteAudioElements.forEach((_, peerId) => {
      if (!this.peerVolumes.has(peerId)) this._applyEffectiveVolume(peerId);
    });
  }

  getMasterOutputVolume(): number {
    return Math.round(this._masterOutputVolume * 100);
  }

  setRemoteAudioVolume(peerId: string, volume: number): void {
    this.peerVolumes.set(peerId, volume);
    this._applyEffectiveVolume(peerId);
  }

  private _applyEffectiveVolume(peerId: string): void {
    const peerVol = this.peerVolumes.get(peerId) ?? 100;
    const effective = (peerVol / 100) * this._masterOutputVolume; // 0..4
    const audio = this.remoteAudioElements.get(peerId);
    const remoteCtx = this.remoteAudioContexts.get(peerId);
    const now = remoteCtx?.context.currentTime ?? 0;
    // Short crossfade window (10 ms) to avoid clicks/pops when crossing the
    // effective=1.0 boundary between the native <audio>.volume path and the
    // gainNode → limiter path.
    const RAMP = 0.01;

    if (effective <= 1) {
      // Native path: ramp gainNode down then disconnect, then unmute native.
      if (remoteCtx?.gainNode) {
        try {
          remoteCtx.gainNode.gain.cancelScheduledValues(now);
          remoteCtx.gainNode.gain.setValueAtTime(remoteCtx.gainNode.gain.value, now);
          remoteCtx.gainNode.gain.linearRampToValueAtTime(0.0001, now + RAMP);
        } catch { /* node may be detached */ }
        const gn = remoteCtx.gainNode;
        const lim = remoteCtx.limiterNode;
        const sat = remoteCtx.saturatorNode;
        setTimeout(() => {
          try { gn.disconnect(); } catch { /* already */ }
          if (lim) { try { lim.disconnect(); } catch { /* already */ } }
          if (sat) { try { sat.disconnect(); } catch { /* already */ } }
        }, RAMP * 1000 + 5);
        remoteCtx.gainNode = null;
        remoteCtx.limiterNode = null;
        remoteCtx.saturatorNode = null;
      }
      if (audio) {
        audio.volume = Math.max(0, effective);
        audio.muted = this.isDeafened || effective === 0;
      }
    } else {
      // Amplification path: mute native, then ramp gainNode up from near-zero.
      if (audio) { audio.volume = 0; audio.muted = true; }
      if (remoteCtx) {
        const freshNode = !remoteCtx.gainNode;
        if (freshNode) {
          remoteCtx.gainNode = remoteCtx.context.createGain();
          remoteCtx.gainNode.gain.value = 0.0001;
          remoteCtx.limiterNode = this._createLimiter(remoteCtx.context);
          remoteCtx.saturatorNode = this._createSaturator(remoteCtx.context);
          remoteCtx.source.connect(remoteCtx.gainNode);
          remoteCtx.gainNode.connect(remoteCtx.limiterNode);
          remoteCtx.limiterNode.connect(remoteCtx.saturatorNode);
          remoteCtx.saturatorNode.connect(remoteCtx.context.destination);
        }
        try {
          remoteCtx.gainNode!.gain.cancelScheduledValues(now);
          remoteCtx.gainNode!.gain.setValueAtTime(remoteCtx.gainNode!.gain.value, now);
          remoteCtx.gainNode!.gain.linearRampToValueAtTime(effective, now + RAMP);
        } catch {
          remoteCtx.gainNode!.gain.value = effective;
        }
      }
    }
  }


  getRemoteAudioVolume(peerId: string): number {
    return this.peerVolumes.get(peerId) ?? 100;
  }

  // ==================== CLEANUP ====================

  async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('[MediaManager] AudioContext resumed');
    }
  }

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
