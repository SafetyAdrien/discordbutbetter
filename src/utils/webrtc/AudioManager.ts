export class AudioManager {
  private audioContext: AudioContext | null = null;
  private localStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private gainNode: GainNode | null = null;
  private isMuted = false;
  private isDeafened = false;

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  async startMicrophone(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        },
        video: false,
      });

      await this.initialize();

      if (this.audioContext && this.localStream) {
        const source = this.audioContext.createMediaStreamSource(this.localStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
      }

      console.log('[AudioManager] Microphone started successfully');
      return this.localStream;
    } catch (error) {
      console.error('[AudioManager] Failed to start microphone:', error);
      throw error;
    }
  }

  stopMicrophone(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      console.log('[AudioManager] Microphone stopped');
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
    console.log('[AudioManager] Mute set to:', muted);
  }

  setDeafened(deafened: boolean): void {
    this.isDeafened = deafened;
    this.audioElements.forEach(audio => {
      audio.muted = deafened;
    });
    console.log('[AudioManager] Deafen set to:', deafened);
  }

  addRemoteStream(peerId: string, stream: MediaStream): void {
    // Remove existing audio element if any
    this.removeRemoteStream(peerId);

    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.muted = this.isDeafened;
    
    audio.play().catch(error => {
      console.error('[AudioManager] Failed to play audio for peer:', peerId, error);
    });

    this.audioElements.set(peerId, audio);
    console.log('[AudioManager] Added remote stream for peer:', peerId);
  }

  removeRemoteStream(peerId: string): void {
    const audio = this.audioElements.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.audioElements.delete(peerId);
      console.log('[AudioManager] Removed remote stream for peer:', peerId);
    }
  }

  getAudioLevel(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average / 255; // Normalize to 0-1
  }

  cleanup(): void {
    this.stopMicrophone();
    this.audioElements.forEach((audio, peerId) => {
      audio.srcObject = null;
      audio.remove();
    });
    this.audioElements.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    console.log('[AudioManager] Cleaned up');
  }
}

export const audioManager = new AudioManager();
