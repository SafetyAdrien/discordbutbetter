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
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
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

  async createOffer(): Promise<void> {
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      console.log('[PeerConnection] Offer created for:', this.peerId);
      this.onSignal({
        type: 'offer',
        data: offer,
      });
    } catch (error) {
      console.error('[PeerConnection] Failed to create offer:', error);
      throw error;
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
          await this.pc.setLocalDescription(answer);
          this.onSignal({
            type: 'answer',
            data: answer,
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

  close(): void {
    this.pc.close();
    this.audioSenders.clear();
    this.videoSenders.clear();
    console.log('[PeerConnection] Closed for peer:', this.peerId);
  }
}
