"""
Objective validation of MediaManager playback chain (fix #3).

Replays the exact chain (gain → DynamicsCompressor limiter, with 10 ms
crossfade between native-volume path and Web Audio path) inside an
OfflineAudioContext, captures raw PCM (Float32, 48 kHz — deterministic;
MediaRecorder rejected because Opus is lossy), and computes:

  Test #3-A — clipping rate at peerVolume=200% (continuous full-scale 440 Hz)
  Test #3-C — discontinuity magnitude when peerVolume slides 80→150→80,
              relative to steady-state per-sample Δ baseline.
"""
import asyncio, json, os
from playwright.async_api import async_playwright

OUT_DIR = "/tmp/browser/audio-validation"
os.makedirs(OUT_DIR, exist_ok=True)

SCRIPT = r"""
async () => {
  function createLimiter(c) {
    const l = c.createDynamicsCompressor();
    l.threshold.value = -1; l.knee.value = 0; l.ratio.value = 20;
    l.attack.value = 0.003; l.release.value = 0.1;
    return l;
  }
  async function render(durationSec, schedule) {
    const sr = 48000;
    const ctx = new OfflineAudioContext(1, Math.ceil(durationSec * sr), sr);
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 440;
    const nativeGain = ctx.createGain(); nativeGain.gain.value = 0;
    const ampGain = ctx.createGain(); ampGain.gain.value = 0.0001;
    const limiter = createLimiter(ctx);
    osc.connect(nativeGain); nativeGain.connect(ctx.destination);
    osc.connect(ampGain); ampGain.connect(limiter); limiter.connect(ctx.destination);
    const RAMP = 0.01;
    for (const { t, volume } of schedule) {
      const effective = volume / 100;
      if (effective <= 1) {
        nativeGain.gain.setValueAtTime(effective, t);
        ampGain.gain.cancelScheduledValues(t);
        ampGain.gain.setValueAtTime(ampGain.gain.value || 0.0001, t);
        ampGain.gain.linearRampToValueAtTime(0.0001, t + RAMP);
      } else {
        nativeGain.gain.setValueAtTime(0, t);
        ampGain.gain.cancelScheduledValues(t);
        ampGain.gain.setValueAtTime(ampGain.gain.value || 0.0001, t);
        ampGain.gain.linearRampToValueAtTime(effective, t + RAMP);
      }
    }
    osc.start(0);
    const buf = await ctx.startRendering();
    return Array.from(buf.getChannelData(0));
  }

  // Test #3-A
  const pcmA = await render(1.0, [{ t: 0, volume: 200 }]);
  const startA = Math.floor(48000 * 0.05);
  let clipped = 0, peak = 0;
  for (let i = startA; i < pcmA.length; i++) {
    const a = Math.abs(pcmA[i]); if (a > peak) peak = a; if (a > 0.999) clipped++;
  }
  const totalA = pcmA.length - startA;

  // Test #3-C
  const pcmC = await render(1.5, [
    { t: 0, volume: 80 }, { t: 0.5, volume: 150 }, { t: 1.0, volume: 80 },
  ]);
  const maxDelta = (pcm, t0, t1) => {
    const s = Math.floor(t0 * 48000), e = Math.min(pcm.length - 1, Math.floor(t1 * 48000));
    let m = 0, at = 0;
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(pcm[i] - pcm[i - 1]);
      if (d > m) { m = d; at = i; }
    }
    return { maxDelta: m, atSec: at / 48000 };
  };
  const baseline = maxDelta(pcmC, 0.20, 0.45);
  const t1 = maxDelta(pcmC, 0.490, 0.520);
  const t2 = maxDelta(pcmC, 0.990, 1.020);
  const thr = baseline.maxDelta * 3;

  return {
    testA: {
      peerVolumePct: 200, samples: totalA, peak, clippedSamples: clipped,
      clipRate: clipped / totalA,
      pass: (clipped / totalA) < 0.001 && peak < 1.001,
    },
    testC: {
      schedule: '80% -> 150% (@0.5s) -> 80% (@1.0s)',
      baselineMaxDelta: baseline.maxDelta,
      transitionUpMaxDelta: t1.maxDelta, transitionUpAtSec: t1.atSec,
      transitionDownMaxDelta: t2.maxDelta, transitionDownAtSec: t2.atSec,
      clickThreshold: thr,
      clickAtUp: t1.maxDelta > thr, clickAtDown: t2.maxDelta > thr,
      pass: t1.maxDelta <= thr && t2.maxDelta <= thr,
    },
  };
}
"""

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("about:blank")
        result = await page.evaluate(SCRIPT)
        print(json.dumps(result, indent=2))
        with open(f"{OUT_DIR}/result.json", "w") as f:
            json.dump(result, f, indent=2)
        await browser.close()

asyncio.run(main())
