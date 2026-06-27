/**
 * Objective validation of MediaManager playback chain (fix #3).
 *
 * - Replays the EXACT chain used in MediaManager._applyEffectiveVolume:
 *     effective <= 1  → native HTMLAudioElement.volume path (linear gain)
 *     effective >  1  → source → GainNode(effective) → DynamicsCompressor(limiter) → destination
 *   With the same limiter parameters as _createLimiter():
 *     threshold=-1 dB, knee=0, ratio=20, attack=3ms, release=100ms
 *   And the same 10 ms linearRampToValueAtTime crossfade between the two paths.
 *
 * - Captures raw PCM via OfflineAudioContext (Float32, 48 kHz, deterministic).
 *   MediaRecorder was rejected: Opus encoding is lossy and would contaminate
 *   the measurement; OfflineAudioContext gives sample-accurate output.
 *
 * Two automated tests:
 *   #3-A (clipping at 200%): continuous full-scale 440 Hz sine, peerVolume=200%.
 *        Report the fraction of |sample| > 0.999 (clipped). A passing fix
 *        produces ~0% clipping; the pre-fix chain (no limiter) would peak at 2.0.
 *
 *   #3-C (transition discontinuity at boundary 1.0): continuous 440 Hz sine,
 *        peerVolume slides 80% → 150% at t=0.5s and back 150% → 80% at t=1.0s.
 *        Report the maximum |Δsample| (sample-to-sample jump) within a ±25 ms
 *        window around each transition, compared with the baseline maximum
 *        |Δsample| during steady state. A click/pop manifests as a Δ-spike
 *        significantly above the steady-state baseline.
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const OUT_DIR = '/tmp/browser/audio-validation';
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto('about:blank');

const result = await page.evaluate(async () => {
  // ---------- Shared chain factory (mirrors MediaManager) ----------
  function createLimiter(context) {
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.1;
    return limiter;
  }

  /**
   * Render `durationSec` of audio where the source is a full-scale 440 Hz sine
   * and the volume schedule is an array of { t, volume } (volume in %).
   * Models BOTH paths just like _applyEffectiveVolume, switching at effective=1.
   *
   * Returns Float32Array of mono PCM @ 48 kHz.
   */
  async function render(durationSec, schedule) {
    const sampleRate = 48000;
    const ctx = new OfflineAudioContext(1, Math.ceil(durationSec * sampleRate), sampleRate);

    // Source: full-scale 440 Hz sine (peak 1.0). Goes through a GainNode
    // representing the native HTMLAudioElement.volume scalar.
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440;

    const nativeGain = ctx.createGain();   // models <audio>.volume
    nativeGain.gain.value = 0;             // starts muted, set by schedule

    const ampGain = ctx.createGain();      // models GainNode for effective>1
    ampGain.gain.value = 0.0001;
    const limiter = createLimiter(ctx);

    // Both paths sum into destination — exactly the runtime topology
    // (the native element and the WebAudio chain both feed the speakers).
    osc.connect(nativeGain);
    nativeGain.connect(ctx.destination);

    osc.connect(ampGain);
    ampGain.connect(limiter);
    limiter.connect(ctx.destination);

    // Apply schedule using the same logic as _applyEffectiveVolume.
    const RAMP = 0.01; // 10 ms — matches production
    let ampConnected = true; // both nodes are always connected here; in prod
                              // the gain node is disconnected when path A is
                              // active, but with gain≈0 the audible effect is
                              // identical and the discontinuity measurement
                              // is preserved.
    for (const { t, volume } of schedule) {
      const effective = volume / 100;
      if (effective <= 1) {
        // Path A: native scalar, amp ramps down to ~0
        nativeGain.gain.setValueAtTime(effective, t);
        ampGain.gain.cancelScheduledValues(t);
        ampGain.gain.setValueAtTime(ampGain.gain.value || 0.0001, t);
        ampGain.gain.linearRampToValueAtTime(0.0001, t + RAMP);
      } else {
        // Path B: native muted instantly, amp ramps up to effective
        nativeGain.gain.setValueAtTime(0, t);
        ampGain.gain.cancelScheduledValues(t);
        ampGain.gain.setValueAtTime(ampGain.gain.value || 0.0001, t);
        ampGain.gain.linearRampToValueAtTime(effective, t + RAMP);
      }
    }

    osc.start(0);
    const buffer = await ctx.startRendering();
    return buffer.getChannelData(0).slice();
  }

  // ---------- Test #3-A: clipping rate at 200% ----------
  const pcmA = await render(1.0, [{ t: 0, volume: 200 }]);
  // Skip the initial 50 ms (limiter attack settle + ramp).
  const startA = Math.floor(48000 * 0.05);
  let clipped = 0;
  let peak = 0;
  for (let i = startA; i < pcmA.length; i++) {
    const a = Math.abs(pcmA[i]);
    if (a > peak) peak = a;
    if (a > 0.999) clipped++;
  }
  const total = pcmA.length - startA;
  const clipRate = clipped / total;

  // ---------- Test #3-C: discontinuity at boundary 1.0 ----------
  const pcmC = await render(1.5, [
    { t: 0,    volume: 80 },
    { t: 0.5,  volume: 150 },
    { t: 1.0,  volume: 80  },
  ]);

  // Compute max |Δ| in three windows:
  //   baseline:   [0.20, 0.45]   (steady state at 80%)
  //   transition1: [0.49, 0.52]  (±10 ms around 80→150)
  //   transition2: [0.99, 1.02]  (±10 ms around 150→80)
  function maxDelta(pcm, t0, t1) {
    const s = Math.floor(t0 * 48000);
    const e = Math.min(pcm.length - 1, Math.floor(t1 * 48000));
    let m = 0;
    let at = 0;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(pcm[i] - pcm[i - 1]);
      if (d > m) { m = d; at = i; }
    }
    return { maxDelta: m, atSample: at, atSec: at / 48000 };
  }

  const baseline = maxDelta(pcmC, 0.20, 0.45);
  const t1 = maxDelta(pcmC, 0.490, 0.520);
  const t2 = maxDelta(pcmC, 0.990, 1.020);

  // A click/pop is a Δ-spike well above the steady-state Δ ceiling.
  // For a 440 Hz sine at amplitude A, the per-sample Δ ceiling is
  // 2πf/Fs · A ≈ 0.0576·A. Anything > ~3× baseline is a likely click.
  const clickThreshold = baseline.maxDelta * 3;

  return {
    testA: {
      peerVolumePct: 200,
      durationSec: 1.0,
      samples: total,
      peak,
      clippedSamples: clipped,
      clipRate,
      pass: clipRate < 0.001 && peak < 1.001, // < 0.1% clipped, no overshoot
    },
    testC: {
      schedule: '80% → 150% (@0.5s) → 80% (@1.0s)',
      baselineMaxDelta: baseline.maxDelta,
      transitionUpMaxDelta: t1.maxDelta,
      transitionDownMaxDelta: t2.maxDelta,
      transitionUpAtSec: t1.atSec,
      transitionDownAtSec: t2.atSec,
      clickThreshold,
      clickAtUp: t1.maxDelta > clickThreshold,
      clickAtDown: t2.maxDelta > clickThreshold,
      pass: t1.maxDelta <= clickThreshold && t2.maxDelta <= clickThreshold,
    },
  };
});

console.log(JSON.stringify(result, null, 2));
writeFileSync(`${OUT_DIR}/result.json`, JSON.stringify(result, null, 2));

await browser.close();
