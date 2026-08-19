import { DESIGN_W, DESIGN_H, ROUND_TIME } from './constants.js'
import { pickMod, rollZone } from './scenarios.js'

export function createCrowdFaces() {
  return Array.from({ length: 9 }, (_, i) => ({
    x: 34 + i * 51,
    jump: 0,
    wa: 0,
  }))
}

function baseRoundFields(mode = 'classic', mod = null) {
  const m = mod || pickMod()
  return {
    mode,
    mod: m,
    angle: 0,
    speed: 0,
    pinched: false,
    tension: 0,
    broken: 0,
    brokenN: 0,
    crowd: m.startCrowd || 0,
    score: 0,
    combo: 0,
    comboT: 0,
    maxCombo: 0,
    zone: rollZone(m),
    zoneTimer: 0,
    inZoneFrames: 0,
    fever: 0,
    event: null,
    eventCooldown: m.eventCooldownStart ?? (mode === 'endless' ? 360 : 420),
    stats: {
      naps: 0,
      duets: 0,
      feverN: 0,
      gusts: 0,
      rosins: 0,
      shields: 0,
      cats: 0,
      golden: 0,
      flights: 0,
    },
    shake: 0,
    tick: 0,
    timeLeft: ROUND_TIME * 60,
    survived: 0,
    shield: false,
    rosinBoost: 0,
    crowdFailArmed: false,
    flash: 0,
    thunderTimer: null,
    lightningTimer: null,
    flyCharge: 0,
    flight: 0,
  }
}

export function createGameState(mode = 'classic') {
  return {
    ...baseRoundFields(mode),
    lastPtrAngle: null,
    ptrActive: false,
    waves: [],
    notes: [],
    confetti: [],
    scenery: [],
    trail: [],
    crowdFaces: createCrowdFaces(),
    toasts: [],
    voice: null,
    motionAsked: false,
    layout: {
      w: DESIGN_W,
      h: DESIGN_H,
      cx: DESIGN_W / 2,
      cy: 280,
      radius: 120,
    },
  }
}

export function resetRound(S, mode) {
  Object.assign(S, baseRoundFields(mode))
  S.waves = []
  S.notes = []
  S.toasts = []
  S.confetti = []
  S.scenery = []
  S.trail = []
  S.crowdFaces.forEach((f) => {
    f.jump = 0
    f.wa = 0
  })
  return S.mod
}

export function updateLayout(S, viewW, viewH) {
  const w = DESIGN_W
  const h = Math.round(DESIGN_W * (viewH / viewW))
  const cx = w / 2
  const cy = Math.round(h * 0.42)
  const radius = Math.min(w, h) * 0.3
  S.layout = { w, h, cx, cy, radius }
  return S.layout
}

export function gain(S, n) {
  return Math.round(n * (S.mod?.mult || 1))
}

export function tryFly(S, { addToast, burstConfetti }) {
  if (S.flight > 0 || S.flyCharge < 100 || S.broken > 0) return false
  const bonus = gain(S, 500)
  S.flight = 170
  S.flyCharge = 0
  S.speed = 0
  S.trail = []
  S.score += bonus
  S.crowd = Math.min(100, S.crowd + 30)
  S.stats.flights++
  S.shake = 8
  S.crowdFaces.forEach((f) => {
    f.jump = 12 + Math.random() * 10
    f.wa = 36
  })
  addToast(`飞上天啦！+${bonus}`, true)
  burstConfetti(30)
  return true
}
