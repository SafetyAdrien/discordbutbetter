export type SignalType = 'offer' | 'answer' | 'ice-candidate';

export interface SignalData {
  type: SignalType;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  trackType?: 'audio' | 'camera' | 'screen';
}

export type OnSignalCallback = (signal: SignalData) => void;
export type OnAudioStreamCallback = (stream: MediaStream) => void;
export type OnVideoStreamCallback = (stream: MediaStream, type: 'camera' | 'screen') => void;
export type OnDisconnectCallback = () => void;

export interface ScreenShareEncodingOptions {
  maxBitrate: number;
  maxFramerate: number;
}

export interface ConnectionStats {
  latency: number;
  packetLoss: number;
  jitter: number;
  bitrate: number;
  iceState: RTCIceConnectionState;
  connectionType: string;
}

// --- Bitrate tiers for adaptive quality ---
const AUDIO_BITRATE_HIGH = 96000;
const AUDIO_BITRATE_MED = 64000;
const AUDIO_BITRATE_LOW = 32000;
const ADAPTATION_INTERVAL_MS = 3000;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class PeerConnection {
  private pc: RTCPeerConnection;
  private peerId: string;
  private onSignal: OnSignalCallback;
  private onAudioStream: OnAudioStreamCallback;
  private onVideoStream: OnVideoStreamCallback;
  private onDisconnect: OnDisconnectCallback;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;
  private audioSenders: Map<string, RTCRtpSender> = new Map();
  private videoSenders: Map<string, RTCRtpSender> = new Map();
  private isRestarting = false;
  private screenEncodingOptions: ScreenShareEncodingOptions | null = null;
  private adaptationTimer: ReturnType<typeof setInterval> | null = null;
  private lastPacketsReceived = 0;
  private lastPacketsLost = 0;

  constructor(
    peerId: string,
    onSignal: OnSignalCallback,
    onAudioStream: OnAudioStreamCallback,
    onVideoStream: OnVideoStreamCallback,
    onDisconnect: OnDisconnectCallback
  ) {
    this.peerId = peerId;
    this.onSignal = onSignal;
    this.onAudioStream = onAudioStream;
    this.onVideoStream = onVideoStream;
    this.onDisconnect = onDisconnect;

    this.pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    this.setupEventHandlers();
    console.log('[PeerConnection] Created for peer:', peerId);
  }

  // --- Event handlers ---

  private setupEventHandlers(): void {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal({
          type: 'ice-candidate',
          data: event.candidate.toJSON(),
        });
      }
    };

    this.pc.ontrack = (event) => {
      console.log('[PeerConnection] Track received from:', this.peerId, 'kind:', event.track.kind);
      if (event.streams[0]) {
        const stream = event.streams[0];
        if (event.track.kind === 'audio') {
          this.onAudioStream(stream);
        } else if (event.track.kind === 'video') {
          const label = event.track.label.toLowerCase();
          const isScreen = label.includes('screen') || label.includes('window') || label.includes('display');
          this.onVideoStream(stream, isScreen ? 'screen' : 'camera');
        }
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('[PeerConnection] ICE state:', this.pc.iceConnectionState, 'for:', this.peerId);
      if (
        this.pc.iceConnectionState === 'disconnected' ||
        this.pc.iceConnectionState === 'failed' ||
        this.pc.iceConnectionState === 'closed'
      ) {
        this.onDisconnect();
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[PeerConnection] Connection state:', this.pc.connectionState, 'for:', this.peerId);
    };
  }

  // --- Stream management ---

  addAudioStream(stream: MediaStream): void {
    stream.getAudioTracks().forEach((track) => {
      const sender = this.pc.addTrack(track, stream);
      this.audioSenders.set(track.id, sender);
    });
    console.log('[PeerConnection] Added audio stream to peer:', this.peerId);
  }

  setScreenShareEncoding(options: ScreenShareEncodingOptions): void {
    this.screenEncodingOptions = options;
  }

  addVideoStream(stream: MediaStream, type: 'camera' | 'screen'): void {
    stream.getVideoTracks().forEach((track) => {
      if (type === 'screen') {
        try { (track as any).contentHint = 'detail'; } catch { /* not supported */ }
      }

      const sender = this.pc.addTrack(track, stream);
      this.videoSenders.set(`${type}-${track.id}`, sender);

      // Apply video codec preferences on the transceiver
      this.applyVideoCodecPreferences(sender, type);

      if (type === 'screen' && this.screenEncodingOptions) {
        this.applyScreenShareEncoding(sender);
      }
    });
    // Also add audio tracks if present (screen share with audio)
    stream.getAudioTracks().forEach((track) => {
      const sender = this.pc.addTrack(track, stream);
      this.audioSenders.set(`${type}-audio-${track.id}`, sender);
    });
    console.log(`[PeerConnection] Added ${type} stream to peer:`, this.peerId);
  }

  removeVideoStream(type: 'camera' | 'screen'): void {
    const toRemove: string[] = [];
    this.videoSenders.forEach((sender, key) => {
      if (key.startsWith(type)) {
        this.pc.removeTrack(sender);
        toRemove.push(key);
      }
    });
    toRemove.forEach((key) => this.videoSenders.delete(key));

    const audioToRemove: string[] = [];
    this.audioSenders.forEach((sender, key) => {
      if (key.startsWith(`${type}-audio`)) {
        this.pc.removeTrack(sender);
        audioToRemove.push(key);
      }
    });
    audioToRemove.forEach((key) => this.audioSenders.delete(key));

    console.log(`[PeerConnection] Removed ${type} stream from peer:`, this.peerId);
  }

  addStream(stream: MediaStream): void {
    this.addAudioStream(stream);
  }

  // --- Negotiation ---

  async createOffer(options?: RTCOfferOptions): Promise<void> {
    try {
      const offer = await this.pc.createOffer(options);
      const optimizedSdp = this.optimizeSdp(offer.sdp || '');
      const optimizedOffer = { ...offer, sdp: optimizedSdp };
      await this.pc.setLocalDescription(optimizedOffer);
      console.log('[PeerConnection] Offer created for:', this.peerId);
      this.onSignal({ type: 'offer', data: optimizedOffer });
      this.startBitrateAdaptation();
    } catch (error) {
      console.error('[PeerConnection] Failed to create offer:', error);
      throw error;
    }
  }

  async handleSignal(signal: SignalData): Promise<void> {
    try {
      switch (signal.type) {
        case 'offer': {
          console.log('[PeerConnection] Handling offer from:', this.peerId);
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
          this.hasRemoteDescription = true;
          await this.processPendingCandidates();
          const answer = await this.pc.createAnswer();
          const optimizedAnswer = { ...answer, sdp: this.optimizeSdp(answer.sdp || '') };
          await this.pc.setLocalDescription(optimizedAnswer);
          this.onSignal({ type: 'answer', data: optimizedAnswer });
          this.startBitrateAdaptation();
          break;
        }
        case 'answer':
          console.log('[PeerConnection] Handling answer from:', this.peerId);
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
          this.hasRemoteDescription = true;
          await this.processPendingCandidates();
          break;

        case 'ice-candidate':
          if (this.hasRemoteDescription) {
            await this.pc.addIceCandidate(new RTCIceCandidate(signal.data as RTCIceCandidateInit));
          } else {
            this.pendingCandidates.push(signal.data as RTCIceCandidateInit);
          }
          break;
      }
    } catch (error) {
      console.error('[PeerConnection] Failed to handle signal:', error);
      throw error;
    }
  }

  async restartIce(): Promise<void> {
    if (this.isRestarting) return;
    try {
      this.isRestarting = true;
      console.log('[PeerConnection] Initiating ICE restart for:', this.peerId);
      this.hasRemoteDescription = false;
      this.pendingCandidates = [];
      await this.createOffer({ iceRestart: true });
    } catch (error) {
      console.error('[PeerConnection] ICE restart failed:', error);
      throw error;
    } finally {
      this.isRestarting = false;
    }
  }

  async renegotiate(): Promise<void> {
    await this.createOffer();
  }

  // --- SDP Optimization ---

  /**
   * Full SDP optimization pipeline:
   * 1. Prioritize Opus codec in m=audio line
   * 2. Optimize Opus fmtp parameters
   */
  private optimizeSdp(sdp: string): string {
    let result = this.prioritizeOpusCodec(sdp);
    result = this.optimizeSdpForOpus(result);
    return result;
  }

  /**
   * Reorder payloads in the m=audio line so Opus (111) is first.
   * This ensures the browser always negotiates Opus as the primary codec.
   */
  private prioritizeOpusCodec(sdp: string): string {
    return sdp.replace(
      /m=audio (\d+) UDP\/TLS\/RTP\/SAVPF ([\d ]+)/,
      (_match, port, payloads) => {
        const pts = payloads.trim().split(/\s+/);
        const opusIdx = pts.indexOf('111');
        if (opusIdx > 0) {
          pts.splice(opusIdx, 1);
          pts.unshift('111');
        }
        return `m=audio ${port} UDP/TLS/RTP/SAVPF ${pts.join(' ')}`;
      }
    );
  }

  /**
   * Optimize Opus fmtp parameters for high-quality voice:
   * - 96kbps bitrate, 48kHz, FEC, DTX
   */
  private optimizeSdpForOpus(sdp: string): string {
    return sdp.replace(
      /a=fmtp:111 (.+)/g,
      (_match, params) => {
        const existingParams = params.split(';').map((p: string) => p.trim());
        const optimizations = [
          'stereo=0',
          'maxaveragebitrate=96000',
          'maxplaybackrate=48000',
          'sprop-maxcapturerate=48000',
          'useinbandfec=1',
          'usedtx=1',
        ];
        const newParams = [...existingParams];
        for (const opt of optimizations) {
          const key = opt.split('=')[0];
          const idx = newParams.findIndex((p) => p.startsWith(key));
          if (idx >= 0) {
            newParams[idx] = opt;
          } else {
            newParams.push(opt);
          }
        }
        return `a=fmtp:111 ${newParams.join(';')}`;
      }
    );
  }

  // --- Video Codec Preferences ---

  /**
   * Set codec preferences on the transceiver:
   * - Screen share: VP9 > VP8 > H264 (better for text/detail)
   * - Camera: H264 > VP9 > VP8 (hardware acceleration)
   */
  private applyVideoCodecPreferences(sender: RTCRtpSender, type: 'camera' | 'screen'): void {
    try {
      const transceiver = this.pc.getTransceivers().find((t) => t.sender === sender);
      if (!transceiver) return;

      const capabilities = RTCRtpSender.getCapabilities?.('video');
      if (!capabilities?.codecs) return;

      const preferredOrder = type === 'screen'
        ? ['VP9', 'VP8', 'H264']
        : ['H264', 'VP9', 'VP8'];

      const sorted = [...capabilities.codecs].sort((a, b) => {
        const aName = (a.mimeType.split('/')[1] || '').toUpperCase();
        const bName = (b.mimeType.split('/')[1] || '').toUpperCase();
        const aIdx = preferredOrder.indexOf(aName);
        const bIdx = preferredOrder.indexOf(bName);
        return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
      });

      transceiver.setCodecPreferences(sorted);
      console.log(`[PeerConnection] Video codec preference set for ${type}:`, preferredOrder[0]);
    } catch (error) {
      console.warn('[PeerConnection] Could not set video codec preferences:', error);
    }
  }

  // --- Screen Share Encoding ---

  private async applyScreenShareEncoding(sender: RTCRtpSender): Promise<void> {
    if (!this.screenEncodingOptions) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = this.screenEncodingOptions.maxBitrate;
      params.encodings[0].maxFramerate = this.screenEncodingOptions.maxFramerate;
      // @ts-ignore - degradationPreference exists on params
      params.degradationPreference = 'maintain-resolution';
      await sender.setParameters(params);
      console.log('[PeerConnection] Applied screen share encoding:', this.screenEncodingOptions);
    } catch (error) {
      console.warn('[PeerConnection] Failed to apply screen share encoding:', error);
    }
  }

  // --- Dynamic Bandwidth Adaptation ---

  private startBitrateAdaptation(): void {
    this.stopBitrateAdaptation();
    this.lastPacketsReceived = 0;
    this.lastPacketsLost = 0;
    this.adaptationTimer = setInterval(() => this.adaptBitrate(), ADAPTATION_INTERVAL_MS);
  }

  private stopBitrateAdaptation(): void {
    if (this.adaptationTimer) {
      clearInterval(this.adaptationTimer);
      this.adaptationTimer = null;
    }
  }

  /**
   * Read getStats() and dynamically adjust audio/video bitrates based on network conditions.
   * - packetLoss > 15%  → audio 32kbps (survival mode)
   * - packetLoss > 5%   → audio 64kbps (degraded)
   * - packetLoss < 2%   → audio 96kbps (optimal)
   * Video senders scale maxBitrate and maxFramerate proportionally.
   */
  private async adaptBitrate(): Promise<void> {
    try {
      const stats = await this.pc.getStats();
      let currentReceived = 0;
      let currentLost = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          currentReceived = report.packetsReceived || 0;
          currentLost = report.packetsLost || 0;
        }
      });

      // Calculate loss rate over the interval (delta-based)
      const deltaReceived = currentReceived - this.lastPacketsReceived;
      const deltaLost = currentLost - this.lastPacketsLost;
      this.lastPacketsReceived = currentReceived;
      this.lastPacketsLost = currentLost;

      const total = deltaReceived + deltaLost;
      if (total <= 0) return; // no data yet

      const lossRate = deltaLost / total;

      let targetAudioBitrate: number;
      let videoScale: number;

      if (lossRate > 0.15) {
        targetAudioBitrate = AUDIO_BITRATE_LOW;
        videoScale = 0.3;
      } else if (lossRate > 0.05) {
        targetAudioBitrate = AUDIO_BITRATE_MED;
        videoScale = 0.6;
      } else if (lossRate < 0.02) {
        targetAudioBitrate = AUDIO_BITRATE_HIGH;
        videoScale = 1.0;
      } else {
        return; // in the 2-5% band, keep current settings
      }

      // Adapt audio senders
      for (const sender of this.audioSenders.values()) {
        if (sender.track?.kind !== 'audio') continue;
        try {
          const params = sender.getParameters();
          if (!params.encodings?.length) continue;
          params.encodings[0].maxBitrate = targetAudioBitrate;
          await sender.setParameters(params);
        } catch { /* some senders may be detached */ }
      }

      // Adapt video senders
      for (const [key, sender] of this.videoSenders.entries()) {
        if (sender.track?.kind !== 'video') continue;
        try {
          const params = sender.getParameters();
          if (!params.encodings?.length) continue;
          const isScreen = key.startsWith('screen');
          const baseBitrate = isScreen
            ? (this.screenEncodingOptions?.maxBitrate || 2_500_000)
            : 1_500_000;
          const baseFramerate = isScreen
            ? (this.screenEncodingOptions?.maxFramerate || 30)
            : 30;
          params.encodings[0].maxBitrate = Math.round(baseBitrate * videoScale);
          params.encodings[0].maxFramerate = Math.round(baseFramerate * videoScale);
          await sender.setParameters(params);
        } catch { /* sender may be detached */ }
      }

      if (lossRate > 0.05) {
        console.log(`[PeerConnection] Adapted bitrate: loss=${(lossRate * 100).toFixed(1)}% audio=${targetAudioBitrate / 1000}kbps videoScale=${videoScale}`);
      }
    } catch (error) {
      console.warn('[PeerConnection] Bitrate adaptation error:', error);
    }
  }

  // --- Stats & Lifecycle ---

  private async processPendingCandidates(): Promise<void> {
    for (const candidate of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[PeerConnection] Failed to add pending candidate:', error);
      }
    }
    this.pendingCandidates = [];
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.pc.connectionState;
  }

  async getStats(): Promise<ConnectionStats> {
    const stats = await this.pc.getStats();
    let latency = 0;
    let packetLoss = 0;
    let jitter = 0;
    let bitrate = 0;
    let connectionType = 'unknown';
    let packetsReceived = 0;
    let packetsLost = 0;

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = report.currentRoundTripTime
          ? Math.round(report.currentRoundTripTime * 1000)
          : 0;
      }
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        packetsReceived = report.packetsReceived || 0;
        packetsLost = report.packetsLost || 0;
        jitter = report.jitter ? Math.round(report.jitter * 1000) : 0;
      }
      if (report.type === 'local-candidate') {
        connectionType = report.candidateType || 'unknown';
      }
    });

    if (packetsReceived + packetsLost > 0) {
      packetLoss = Math.round((packetsLost / (packetsReceived + packetsLost)) * 1000) / 10;
    }

    return { latency, packetLoss, jitter, bitrate, iceState: this.pc.iceConnectionState, connectionType };
  }

  close(): void {
    this.stopBitrateAdaptation();
    this.pc.close();
    this.audioSenders.clear();
    this.videoSenders.clear();
    console.log('[PeerConnection] Closed for peer:', this.peerId);
  }
}
