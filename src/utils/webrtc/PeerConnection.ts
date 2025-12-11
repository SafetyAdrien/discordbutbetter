export type SignalType = 'offer' | 'answer' | 'ice-candidate';

export interface SignalData {
  type: SignalType;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export type OnSignalCallback = (signal: SignalData) => void;
export type OnStreamCallback = (stream: MediaStream) => void;
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
  private onStream: OnStreamCallback;
  private onDisconnect: OnDisconnectCallback;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;

  constructor(
    peerId: string,
    onSignal: OnSignalCallback,
    onStream: OnStreamCallback,
    onDisconnect: OnDisconnectCallback
  ) {
    this.peerId = peerId;
    this.onSignal = onSignal;
    this.onStream = onStream;
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
      console.log('[PeerConnection] Track received from:', this.peerId);
      if (event.streams[0]) {
        this.onStream(event.streams[0]);
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

  addStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => {
      this.pc.addTrack(track, stream);
    });
    console.log('[PeerConnection] Added local stream to peer:', this.peerId);
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

  close(): void {
    this.pc.close();
    console.log('[PeerConnection] Closed for peer:', this.peerId);
  }
}
