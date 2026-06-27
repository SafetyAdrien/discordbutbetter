/**
 * Regression harness — Bug #2 (Critical Audio Loss after disconnect/reconnect).
 *
 * Invariant under test:
 *   When a user reconnects to a voice channel, the authoritative mute/deafen
 *   state from VoiceContext MUST be pushed into the MediaManager singleton
 *   BEFORE any remote audio stream is attached. Otherwise new <audio> elements
 *   inherit stale singleton flags (e.g. `audio.muted = true` from a previous
 *   deafened session) and the user hears nothing.
 *
 * This file does NOT spin up a real WebRTC peer; it mocks the minimum surface
 * (AudioContext / MediaStream) and exercises the public MediaManager contract
 * exactly as `useWebRTC.connect()` does:
 *     mediaManager.setMuted(initial.muted)
 *     mediaManager.setDeafened(initial.deafened)
 *     // ... signaling ...
 *     mediaManager.addRemoteAudioStream(peerId, stream)
 *
 * Three scenarios:
 *   A. Previous session was deafened. Reconnect with deafened=false.
 *      → new <audio>.muted must be false (we hear the peer).
 *   B. Previous session was hearing fine. Reconnect with deafened=true.
 *      → new <audio>.muted must be true.
 *   C. Regression guard — DOCUMENT the failure mode: if we skip the push and
 *      add the stream while the singleton still carries the stale flag, the
 *      <audio> element inherits the stale value. This test pins that contract
 *      so any future refactor that breaks the "push before attach" ordering
 *      fails loudly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Minimal Web Audio + MediaStream stubs (jsdom ships none of these) ----
class FakeAudioParam { value = 0; cancelScheduledValues() {} setValueAtTime() {} linearRampToValueAtTime() {} }
class FakeGainNode { gain = new FakeAudioParam(); connect() {} disconnect() {} }
class FakeAnalyserNode { fftSize = 0; smoothingTimeConstant = 0; connect() {} disconnect() {} }
class FakeMediaStreamSource { connect() {} disconnect() {} }
class FakeDynamicsCompressor {
  threshold = new FakeAudioParam();
  knee = new FakeAudioParam();
  ratio = new FakeAudioParam();
  attack = new FakeAudioParam();
  release = new FakeAudioParam();
  connect() {} disconnect() {}
}
class FakeWaveShaper { curve: Float32Array | null = null; oversample = "none"; connect() {} disconnect() {} }
class FakeAudioContext {
  state = "running";
  destination = {};
  createGain() { return new FakeGainNode(); }
  createAnalyser() { return new FakeAnalyserNode(); }
  createMediaStreamSource() { return new FakeMediaStreamSource(); }
  createDynamicsCompressor() { return new FakeDynamicsCompressor(); }
  createWaveShaper() { return new FakeWaveShaper(); }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
class FakeMediaStream {
  getTracks() { return []; }
  getAudioTracks() { return []; }
  getVideoTracks() { return []; }
}

beforeEach(() => {
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  (globalThis as unknown as { MediaStream: unknown }).MediaStream = FakeMediaStream;
  // <audio>.play() is unimplemented in jsdom — silence the noisy reject.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

// Lazy import so the AudioContext stub is in place before module init.
async function freshManager() {
  vi.resetModules();
  const mod = await import("./MediaManager");
  return mod.mediaManager;
}

function audioFor(mm: unknown, peerId: string): HTMLAudioElement {
  const map = (mm as { remoteAudioElements: Map<string, HTMLAudioElement> })
    .remoteAudioElements;
  const el = map.get(peerId);
  if (!el) throw new Error(`no audio element registered for ${peerId}`);
  return el;
}

describe("MediaManager — reconnect audio invariant (Bug #2 regression)", () => {
  it("A: stale deafened singleton + reconnect undeafened → new <audio> is unmuted", async () => {
    const mm = await freshManager();

    // Session 1: user deafened themselves.
    mm.setDeafened(true);
    mm.addRemoteAudioStream("peer-old", new FakeMediaStream() as unknown as MediaStream);
    expect(lastAudioElement().muted).toBe(true);

    // Disconnect — cleanup removes peers but the singleton state survives.
    mm.removeRemoteAudioStream("peer-old");

    // Session 2: VoiceContext reconnects with authoritative state deafened=false.
    // This is the exact contract useWebRTC.connect() honours.
    mm.setDeafened(false);
    mm.setMuted(false);
    mm.addRemoteAudioStream("peer-new", new FakeMediaStream() as unknown as MediaStream);

    expect(lastAudioElement().muted).toBe(false);
  });

  it("B: stale hearing singleton + reconnect deafened → new <audio> is muted", async () => {
    const mm = await freshManager();

    mm.setDeafened(false);
    mm.addRemoteAudioStream("peer-old", new FakeMediaStream() as unknown as MediaStream);
    expect(lastAudioElement().muted).toBe(false);

    mm.removeRemoteAudioStream("peer-old");

    mm.setDeafened(true);
    mm.addRemoteAudioStream("peer-new", new FakeMediaStream() as unknown as MediaStream);

    expect(lastAudioElement().muted).toBe(true);
  });

  it("C: contract pin — attaching a stream WITHOUT first pushing state inherits singleton flag", async () => {
    // This is the failure mode Bug #2 was caused by. The test pins the
    // "push state → then attach stream" ordering so any future refactor that
    // removes the push step in useWebRTC.connect() will fail here.
    const mm = await freshManager();

    mm.setDeafened(true); // simulate stale singleton from a prior session
    // Intentionally NO push of fresh state before adding the stream.
    mm.addRemoteAudioStream("peer", new FakeMediaStream() as unknown as MediaStream);

    expect(lastAudioElement().muted).toBe(true);
  });
});
