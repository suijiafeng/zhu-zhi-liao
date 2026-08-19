import { getCtx, isMuted } from './context.js'
import { rand } from '../game/utils.js'

export const beep = (f, d = 0.12, type = 'sine', v = 0.15, slide = 0) => {
  if (isMuted()) return
  try {
    const ctx = getCtx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.value = f
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), ctx.currentTime + d)
    g.gain.setValueAtTime(v, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + d)
  } catch {}
}

export const sndCrowdWa = () => {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => beep(rand(280, 430), 0.5, 'sine', 0.055, -rand(60, 150)), i * 45)
  }
}
export const sndSnap = () => {
  beep(700, 0.08, 'square', 0.25)
  setTimeout(() => beep(150, 0.4, 'sawtooth', 0.2, -80), 60)
}
export const sndCombo = (n) => beep(500 + Math.min(n, 12) * 70, 0.15, 'sine', 0.16)
export const sndFanfare = () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.14), i * 120))
export const sndWildWa = () => beep(rand(400, 480), 0.28, 'sawtooth', 0.1, -120)
export const sndSnore = () => beep(110, 0.5, 'sine', 0.1, 20)
export const sndAngry = () => {
  beep(200, 0.15, 'square', 0.18)
  setTimeout(() => beep(160, 0.25, 'square', 0.18, -40), 130)
}
export const sndSuccess = () => {
  beep(660, 0.12, 'sine', 0.15)
  setTimeout(() => beep(990, 0.2, 'sine', 0.15), 100)
}
export const sndGust = () => {
  beep(180, 0.35, 'sawtooth', 0.08, 80)
  setTimeout(() => beep(240, 0.25, 'sine', 0.06, -40), 80)
}
export const sndRosin = () => {
  beep(520, 0.1, 'triangle', 0.12)
  setTimeout(() => beep(780, 0.18, 'sine', 0.1), 70)
}
export const sndShield = () => {
  beep(880, 0.08, 'sine', 0.14)
  setTimeout(() => beep(440, 0.2, 'triangle', 0.12, -100), 50)
}
export const sndThunder = () => {
  beep(70, 0.9, 'sawtooth', 0.18, -25)
  setTimeout(() => beep(50, 0.6, 'sawtooth', 0.12, -15), 140)
}
export const sndLightning = () => {
  beep(1400, 0.06, 'square', 0.12)
  beep(180, 0.35, 'sawtooth', 0.16, -60)
}
export const sndMeow = () => {
  beep(620, 0.18, 'sine', 0.14, -180)
  setTimeout(() => beep(430, 0.22, 'sine', 0.12, -120), 140)
}
export const sndFly = () => {
  beep(300, 0.9, 'sawtooth', 0.14, 750)
  for (let i = 0; i < 4; i++) {
    setTimeout(() => beep(230 - i * 18, 0.26, 'sawtooth', 0.2, -50), 350 + i * 190)
  }
}
export const sndChime = () => {
  ;[880, 1318, 1760].forEach((f, i) => setTimeout(() => beep(f, 0.35, 'sine', 0.13), i * 70))
}
export const sndWhiff = () => beep(240, 0.18, 'sine', 0.08, -140)
