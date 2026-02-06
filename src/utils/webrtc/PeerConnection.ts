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

const ICE_SERVERS: RTCIceServer[] = [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // TURN servers (OpenRelay - free public relay for NAT traversal)
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
    });

    this.setupEventHandlers();
    console.log('[PeerConnection] Created for peer:', peerId);
  }

  private setupEventHandlers(): void {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[PeerConnection] ICE candidate generated for:', this.peerId);
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
          // Determine if this is camera or screen based on track label/settings
          const isScreen = event.track.label.toLowerCase().includes('screen') ||
                          event.track.label.toLowerCase().includes('window') ||
                          event.track.label.toLowerCase().includes('display');
          this.onVideoStream(stream, isScreen ? 'screen' : 'camera');
        }
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('[PeerConnection] ICE state:', this.pc.iceConnectionState, 'for:', this.peerId);
      if (this.pc.iceConnectionState === 'disconnected' || 
          this.pc.iceConnectionState === 'failed' ||
          this.pc.iceConnectionState === 'closed') {
        this.onDisconnect();
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[PeerConnection] Connection state:', this.pc.connectionState, 'for:', this.peerId);
    };
  }

  addAudioStream(stream: MediaStream): void {
    stream.getAudioTracks().forEach(track => {
      const sender = this.pc.addTrack(track, stream);
      this.audioSenders.set(track.id, sender);
    });
    console.log('[PeerConnection] Added audio stream to peer:', this.peerId);
  }

  addVideoStream(stream: MediaStream, type: 'camera' | 'screen'): void {
    stream.getVideoTracks().forEach(track => {
      const sender = this.pc.addTrack(track, stream);
      this.videoSenders.set(`${type}-${track.id}`, sender);
    });
    // Also add audio tracks if present (for screen share with audio)
    stream.getAudioTracks().forEach(track => {
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
    toRemove.forEach(key => this.videoSenders.delete(key));
    
    // Also remove associated audio tracks (for screen share)
    const audioToRemove: string[] = [];
    this.audioSenders.forEach((sender, key) => {
      if (key.startsWith(`${type}-audio`)) {
        this.pc.removeTrack(sender);
        audioToRemove.push(key);
      }
    });
    audioToRemove.forEach(key => this.audioSenders.delete(key));
    
    console.log(`[PeerConnection] Removed ${type} stream from peer:`, this.peerId);
  }

  // Legacy method for backward compatibility
  addStream(stream: MediaStream): void {
    this.addAudioStream(stream);
  }

  async createOffer(options?: RTCOfferOptions): Promise<void> {
    try {
      const offer = await this.pc.createOffer(options);
      // Optimize SDP for Opus codec
      const optimizedSdp = this.optimizeSdpForOpus(offer.sdp || '');
      const optimizedOffer = { ...offer, sdp: optimizedSdp };
      await this.pc.setLocalDescription(optimizedOffer);
      console.log('[PeerConnection] Offer created for:', this.peerId);
      this.onSignal({
        type: 'offer',
        data: optimizedOffer,
      });
    } catch (error) {
      console.error('[PeerConnection] Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Optimize SDP for Opus codec with Discord-like parameters
   * - Force mono (voice doesn't need stereo)
   * - Set optimal bitrate for voice
   * - Enable in-band FEC for packet loss recovery
   * - Enable DTX for bandwidth saving during silence
   */
  private optimizeSdpForOpus(sdp: string): string {
    // Find Opus codec line and add optimized parameters
    return sdp.replace(
      /a=fmtp:111 (.+)/g,
      (match, params) => {
        // Parse existing params
        const existingParams = params.split(';').map((p: string) => p.trim());
        
        // Add our optimizations if not present
        const optimizations = [
          'stereo=0',              // Mono for voice
          'maxaveragebitrate=64000', // 64kbps - good quality for voice
          'useinbandfec=1',        // Enable FEC for packet loss recovery
          'usedtx=1',              // Enable DTX for silence detection
        ];
        
        const newParams = [...existingParams];
        for (const opt of optimizations) {
          const key = opt.split('=')[0];
          if (!newParams.some(p => p.startsWith(key))) {
            newParams.push(opt);
          }
        }
        
        return `a=fmtp:111 ${newParams.join(';')}`;
      }
    );
  }

  /**
   * Restart ICE connection without full reconnection
   * Useful for recovering from failed/disconnected states
   */
  async restartIce(): Promise<void> {
    if (this.isRestarting) {
      console.log('[PeerConnection] ICE restart already in progress for:', this.peerId);
      return;
    }

    try {
      this.isRestarting = true;
      console.log('[PeerConnection] Initiating ICE restart for:', this.peerId);
      
      // Reset state for new ICE gathering
      this.hasRemoteDescription = false;
      this.pendingCandidates = [];
      
      // Create offer with ICE restart flag
      await this.createOffer({ iceRestart: true });
    } catch (error) {
      console.error('[PeerConnection] ICE restart failed:', error);
      throw error;
    } finally {
      this.isRestarting = false;
    }
  }

  async handleSignal(signal: SignalData): Promise<void> {
    try {
      switch (signal.type) {
        case 'offer':
          console.log('[PeerConnection] Handling offer from:', this.peerId);
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
          this.hasRemoteDescription = true;
          await this.processPendingCandidates();
          const answer = await this.pc.createAnswer();
          // Optimize answer SDP too
          const optimizedAnswer = { 
            ...answer, 
            sdp: this.optimizeSdpForOpus(answer.sdp || '') 
          };
          await this.pc.setLocalDescription(optimizedAnswer);
          this.onSignal({
            type: 'answer',
            data: optimizedAnswer,
          });
          break;

        case 'answer':
          console.log('[PeerConnection] Handling answer from:', this.peerId);
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
          this.hasRemoteDescription = true;
          await this.processPendingCandidates();
          break;

        case 'ice-candidate':
          console.log('[PeerConnection] Handling ICE candidate from:', this.peerId);
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

  async renegotiate(): Promise<void> {
    await this.createOffer();
  }

  // Get WebRTC connection statistics
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
      // Get RTT from candidate-pair
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = report.currentRoundTripTime 
          ? Math.round(report.currentRoundTripTime * 1000) 
          : 0;
      }
      
      // Get packet loss from inbound-rtp
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        packetsReceived = report.packetsReceived || 0;
        packetsLost = report.packetsLost || 0;
        jitter = report.jitter ? Math.round(report.jitter * 1000) : 0;
      }
      
      // Get connection type from local candidate
      if (report.type === 'local-candidate') {
        connectionType = report.candidateType || 'unknown';
      }
    });

    // Calculate packet loss percentage
    if (packetsReceived + packetsLost > 0) {
      packetLoss = Math.round((packetsLost / (packetsReceived + packetsLost)) * 1000) / 10;
    }

    return {
      latency,
      packetLoss,
      jitter,
      bitrate,
      iceState: this.pc.iceConnectionState,
      connectionType,
    };
  }

  close(): void {
    this.pc.close();
    this.audioSenders.clear();
    this.videoSenders.clear();
    console.log('[PeerConnection] Closed for peer:', this.peerId);
  }
}

export interface ConnectionStats {
  latency: number;
  packetLoss: number;
  jitter: number;
  bitrate: number;
  iceState: RTCIceConnectionState;
  connectionType: string;
}
