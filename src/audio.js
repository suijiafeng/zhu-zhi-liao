import { rand, clamp } from './utils.js'

let audioContext = null
let muted = false

export const getAudioContext = () => {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)()
  if (audioContext.state === 'suspended') audioContext.resume()
  return audioContext
}

export const setMuted = (value) => { muted = value }

// 真实竹知了是线在松香上"黏—滑"交替摩擦产生脉冲，经筒口薄膜共鸣放大。
// 合成链路：低频锯齿波 → 失真 → LFO 调幅(黏滑脉冲) → 相位扫频"哇音"带通
//          → 三个共振峰(模拟薄膜腔体) + 摩擦噪声层 → 压限输出
export function createCicadaVoice() {
  const ctx = getAudioContext()

  // 主振荡：低基频锯齿波（真实玩具基频很低，"哇"的音色靠共振峰塑形）
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = 70

  // 失真：让摩擦声有毛刺感
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

  // 黏滑脉冲：LFO 调幅
  const am = ctx.createGain(); am.gain.value = 0.6
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'; lfo.frequency.value = 24
  const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.35
  lfo.connect(lfoAmt).connect(am.gain)
  shaper.connect(am)

  // 摩擦噪声层
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer; noise.loop = true
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 2500; noiseFilter.Q.value = 0.7
  const noiseGain = ctx.createGain(); noiseGain.gain.value = 0
  noise.connect(noiseFilter).connect(noiseGain)

  const bus = ctx.createGain(); bus.gain.value = 0.9
  am.connect(bus); noiseGain.connect(bus)

  // "哇音"带通：中心频率随甩动相位摆动（哇~的开合感）
  const wah = ctx.createBiquadFilter()
  wah.type = 'bandpass'; wah.frequency.value = 900; wah.Q.value = 2.2
  bus.connect(wah)

  // 三个共振峰：模拟筒口薄膜 + 竹筒腔体的固有共振
  const formantSum = ctx.createGain(); formantSum.gain.value = 1
  ;[[1050, 9, 0.9], [2150, 11, 0.6], [3350, 13, 0.4]].forEach(([freq, q, level]) => {
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q
    const bpGain = ctx.createGain(); bpGain.gain.value = level
    wah.connect(bp).connect(bpGain).connect(formantSum)
  })
  const bleed = ctx.createGain(); bleed.gain.value = 0.08
  wah.connect(bleed).connect(formantSum)

  const highpass = ctx.createBiquadFilter()
  highpass.type = 'highpass'; highpass.frequency.value = 360
  const master = ctx.createGain(); master.gain.value = 0
  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -18; compressor.ratio.value = 8
  compressor.attack.value = 0.004; compressor.release.value = 0.18
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null
  formantSum.connect(highpass).connect(master).connect(compressor)
  if (panner) { compressor.connect(panner).connect(ctx.destination) } else { compressor.connect(ctx.destination) }

  osc.start(); lfo.start(); noise.start()

  return {
    // speed: 0-1 强度；theta: 当前甩动角度（相位联动的关键）
    set(speed, pinched, theta = 0) {
      const t = ctx.currentTime
      const active = pinched ? 0 : clamp(speed, 0, 1)
      master.gain.setTargetAtTime(0.8 * Math.pow(active, 1.3), t, pinched ? 0.015 : 0.07)
      // 低基频 + 每圈一摆的音高微颤（张力/多普勒感）
      const f0 = clamp(55 + speed * 140, 50, 195)
      osc.frequency.setTargetAtTime(f0, t, 0.06)
      osc.detune.setTargetAtTime(46 * Math.sin(theta + 0.9) * clamp(active * 1.6, 0, 1), t, 0.03)
      // 黏滑脉冲密度随转速
      lfo.frequency.setTargetAtTime(20 + speed * 22, t, 0.1)
      // "哇音"扫频随相位开合 —— 哇~哇~ 的灵魂；乘个倍数让每圈里"哇"的次数变多、周期更短
      const wf = 760 + 520 * active + (430 + 330 * active) * Math.sin(theta * 1.6 - 0.7)
      wah.frequency.setTargetAtTime(Math.max(320, wf), t, 0.025)
      // 摩擦噪声
      noiseGain.gain.setTargetAtTime(0.03 + 0.16 * active, t, 0.08)
      // 声像随甩动位置左右摆动
      if (panner) panner.pan.setTargetAtTime(clamp(Math.cos(theta) * 0.85, -1, 1), t, 0.05)
    },
    stop() { try { osc.stop(); lfo.stop(); noise.stop() } catch {} },
  }
}

export const beep = (freq, duration = 0.12, type = 'sine', volume = 0.15, slide = 0, formant = 0) => {
  if (muted) return
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator(); const gain = ctx.createGain()
    osc.type = type; osc.frequency.value = freq
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + duration)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    let out = osc.connect(gain)
    if (formant) { // 可选共振峰，让单声"嘎"也带鼻音
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'; filter.frequency.value = formant; filter.Q.value = 6
      out = out.connect(filter)
    }
    out.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration)
  } catch {}
}

export const sndCrowdWa = () => { for (let i = 0; i < 5; i++) setTimeout(() => beep(rand(280, 430), 0.5, 'sine', 0.055, -rand(60, 150)), i * 45) }
export const sndSnap = () => { beep(700, 0.08, 'square', 0.25); setTimeout(() => beep(150, 0.4, 'sawtooth', 0.2, -80), 60) }
export const sndCombo = (n) => beep(500 + Math.min(n, 12) * 70, 0.15, 'sine', 0.16)
export const sndFanfare = () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.14), i * 120))
export const sndWildWa = () => beep(rand(175, 210), 0.3, 'sawtooth', 0.32, -65, 1050)
export const sndSnore = () => beep(110, 0.5, 'sine', 0.1, 20)
export const sndAngry = () => { beep(200, 0.15, 'square', 0.18); setTimeout(() => beep(160, 0.25, 'square', 0.18, -40), 130) }
export const sndSuccess = () => { beep(660, 0.12, 'sine', 0.15); setTimeout(() => beep(990, 0.2, 'sine', 0.15), 100) }
export const sndMeow = () => { beep(620, 0.18, 'sine', 0.14, -180); setTimeout(() => beep(430, 0.22, 'sine', 0.12, -120), 140) }
export const sndFly = () => {
  beep(300, 0.9, 'sawtooth', 0.14, 750, 1200)
  for (let i = 0; i < 4; i++) setTimeout(() => beep(230 - i * 18, 0.26, 'sawtooth', 0.2, -50, 1000), 350 + i * 190)
}
export const sndChime = () => [880, 1318, 1760].forEach((f, i) => setTimeout(() => beep(f, 0.35, 'sine', 0.13), i * 70))
export const sndWhiff = () => beep(240, 0.18, 'sine', 0.08, -140)
export const sndThunder = () => {
  beep(70, 0.9, 'sawtooth', 0.18, -25)
  setTimeout(() => beep(50, 0.6, 'sawtooth', 0.12, -15), 140)
}
export const sndLightning = () => { beep(1400, 0.06, 'square', 0.12); beep(180, 0.35, 'sawtooth', 0.16, -60) }
