import { getCtx, isMuted } from './context.js'
import { clamp } from '../game/utils.js'

/** 黏—滑脉冲式蝉鸣：锯齿 → 失真 → LFO 调幅 → 哇音带通 → 共振峰 → 噪声 → 压限 */
export function createCicadaVoice() {
  const ctx = getCtx()

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = 70

  const shaper = ctx.createWaveShaper()
  {
    const n = 1024
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1
      curve[i] = Math.tanh(x * 3)
    }
    shaper.curve = curve
    shaper.oversample = '2x'
  }
  osc.connect(shaper)

  const am = ctx.createGain()
  am.gain.value = 0.6
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 24
  const lfoAmt = ctx.createGain()
  lfoAmt.gain.value = 0.35
  lfo.connect(lfoAmt).connect(am.gain)
  shaper.connect(am)

  const nBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const nd = nBuf.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = nBuf
  noise.loop = true
  const nFil = ctx.createBiquadFilter()
  nFil.type = 'bandpass'
  nFil.frequency.value = 2500
  nFil.Q.value = 0.7
  const nGain = ctx.createGain()
  nGain.gain.value = 0
  noise.connect(nFil).connect(nGain)

  const bus = ctx.createGain()
  bus.gain.value = 0.9
  am.connect(bus)
  nGain.connect(bus)

  const wah = ctx.createBiquadFilter()
  wah.type = 'bandpass'
  wah.frequency.value = 900
  wah.Q.value = 2.2
  bus.connect(wah)

  const sum = ctx.createGain()
  sum.gain.value = 1
  ;[[1050, 9, 0.9], [2150, 11, 0.6], [3350, 13, 0.4]].forEach(([f, q, g]) => {
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = f
    bp.Q.value = q
    const fg = ctx.createGain()
    fg.gain.value = g
    wah.connect(bp).connect(fg).connect(sum)
  })
  const bleed = ctx.createGain()
  bleed.gain.value = 0.08
  wah.connect(bleed).connect(sum)

  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 360
  const master = ctx.createGain()
  master.gain.value = 0
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 8
  comp.attack.value = 0.004
  comp.release.value = 0.18
  sum.connect(hp).connect(master).connect(comp).connect(ctx.destination)

  osc.start()
  lfo.start()
  noise.start()

  return {
    set(speed, pinched, theta = 0) {
      const t = ctx.currentTime
      if (isMuted()) {
        master.gain.setTargetAtTime(0, t, 0.02)
        return
      }
      const active = pinched ? 0 : clamp(speed, 0, 1)
      master.gain.setTargetAtTime(0.8 * Math.pow(active, 1.3), t, pinched ? 0.015 : 0.07)
      const f0 = clamp(55 + speed * 140, 50, 195)
      osc.frequency.setTargetAtTime(f0, t, 0.06)
      osc.detune.setTargetAtTime(46 * Math.sin(theta + 0.9) * clamp(active * 1.6, 0, 1), t, 0.03)
      lfo.frequency.setTargetAtTime(20 + speed * 22, t, 0.1)
      const wf = 760 + 520 * active + (430 + 330 * active) * Math.sin(theta - 0.7)
      wah.frequency.setTargetAtTime(Math.max(320, wf), t, 0.025)
      nGain.gain.setTargetAtTime(0.03 + 0.16 * active, t, 0.08)
    },
    stop() {
      try {
        osc.stop()
        lfo.stop()
        noise.stop()
      } catch {}
    },
  }
}
