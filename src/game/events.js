import { clamp, rand } from './utils.js'
import { inZone } from './physics.js'
import { nextEventCooldown } from './scenarios.js'
import { gain } from './state.js'
import { CAT_SCARE_LO } from './constants.js'
import {
  sndAngry,
  sndChime,
  sndGust,
  sndMeow,
  sndRosin,
  sndSnap,
  sndSnore,
  sndSuccess,
  sndWhiff,
  sndWildWa,
} from '../audio/sfx.js'

export function createEventHelpers(S) {
  const addToast = (text, big = false) => {
    const { cy } = S.layout
    S.toasts.push({ text, y: cy - 130, life: 75, big })
  }

  const burstConfetti = (n = 40) => {
    const { w } = S.layout
    for (let i = 0; i < n; i++) {
      S.confetti.push({
        x: rand(0, w),
        y: -10,
        vx: rand(-1, 1),
        vy: rand(1, 3),
        color: ['#d9463e', '#f2b632', '#5aaa5a', '#5b7fa6', '#a67ab0'][i % 5],
        rot: rand(0, 6),
        vr: rand(-0.2, 0.2),
        life: rand(80, 160),
      })
    }
  }

  return { addToast, burstConfetti }
}

function spawnNap(S, addToast) {
  const { w } = S.layout
  S.event = { type: 'nap', t: 240, warn: 60, x: w - 70 }
  addToast('老爷爷睡着了，掐线保持安静', true)
  sndSnore()
}

function spawnDuet(S, addToast) {
  S.event = { type: 'duet', stage: 'call', calls: 3, callT: 0, t: 0, x: 60, good: 0 }
  addToast('野蝉起调了，准备应和', true)
}

function spawnGust(S, addToast) {
  const { w } = S.layout
  S.event = { type: 'gust', t: 150, force: 0.36, active: true, x: w / 2 }
  addToast('阵风来了！掐线或减速', true)
  sndGust()
}

function spawnRosin(S, addToast) {
  const { cx, cy, radius } = S.layout
  const ang = rand(0, Math.PI * 2)
  S.event = {
    type: 'rosin',
    t: 220,
    x: cx + Math.cos(ang) * radius * 0.7,
    y: cy + Math.sin(ang) * radius * 0.4,
    got: false,
  }
  addToast('松香出现了，甩进绿区蹭一下', true)
}

function spawnCat(S, addToast) {
  const { w } = S.layout
  const fromLeft = Math.random() < 0.5
  S.event = {
    type: 'cat',
    stage: 'stalk',
    t: 300,
    scare: 0,
    fromLeft,
    px: fromLeft ? -24 : w + 24,
  }
  addToast('野猫盯上蝉了！甩快些吓走它', true)
  sndMeow()
}

function spawnGolden(S, addToast) {
  S.event = { type: 'golden', t: 100, fromLeft: Math.random() < 0.5, caught: false }
  addToast('金蝉现身！稳住绿区接住它', true)
}

export function maybeSpawnEvent(S, addToast) {
  if (S.event || S.fever > 0 || S.flight > 0) return
  if (S.eventCooldown-- > 0) return

  if (Math.random() < 0.1) {
    spawnGolden(S, addToast)
    return
  }

  const r = Math.random()
  const napP = clamp(0.26 + (S.mod?.napWeightBonus || 0), 0.1, 0.65)
  const duetHi = napP + 0.22 + (S.mod?.duetWeightBonus || 0)
  const gustHi = duetHi + 0.2
  const catHi = gustHi + 0.18
  if (r < napP) spawnNap(S, addToast)
  else if (r < duetHi) spawnDuet(S, addToast)
  else if (r < gustHi) spawnGust(S, addToast)
  else if (r < catHi) spawnCat(S, addToast)
  else spawnRosin(S, addToast)
}

function cooldown(S) {
  if (S.mod) {
    S.eventCooldown = nextEventCooldown(S.mod)
    if (S.mode === 'endless') {
      S.eventCooldown = Math.max(180, S.eventCooldown - Math.min(S.survived / 4, 120))
    }
    return
  }
  const base = S.mode === 'endless' ? rand(280, 480) : rand(420, 640)
  const cut = S.mode === 'endless' ? Math.min(S.survived / 4, 120) : 0
  S.eventCooldown = Math.max(180, base - cut)
}

export function updateEvent(S, { addToast, burstConfetti }) {
  const ev = S.event
  if (!ev) {
    maybeSpawnEvent(S, addToast)
    return
  }

  const { w, cx } = S.layout

  if (ev.type === 'nap') {
    ev.t--
    const noisy = S.speed > 0.1 && !S.pinched
    if (noisy && ev.warn-- <= 0) {
      S.event = null
      cooldown(S)
      S.crowd = clamp(S.crowd - 25, 0, 100)
      S.combo = 0
      sndAngry()
      S.shake = 10
      addToast('吵醒老爷爷了！', true)
      return
    }
    if (!noisy) ev.warn = Math.min(ev.warn + 0.5, 60)
    if (ev.t <= 0) {
      S.event = null
      cooldown(S)
      const bonus = gain(S, 150 * (S.mod?.napBonusMult || 1))
      S.score += bonus
      S.crowd = clamp(S.crowd + 15, 0, 100)
      S.stats.naps++
      sndSuccess()
      addToast(`没吵醒他！+${bonus}`, true)
    }
  } else if (ev.type === 'duet') {
    if (ev.stage === 'call') {
      if (ev.callT-- <= 0) {
        ev.callT = 40
        ev.calls--
        sndWildWa()
        ev.pulse = 20
        if (ev.calls <= 0) {
          ev.stage = 'answer'
          ev.t = 200
          addToast('轮到你了！稳住绿区应和')
        }
      }
    } else {
      ev.t--
      if (inZone(S) && S.broken === 0 && !S.pinched) ev.good = (ev.good || 0) + 1
      if (ev.t <= 0) {
        const ok = (ev.good || 0) > 110
        S.event = null
        cooldown(S)
        if (ok) {
          const bonus = gain(S, 250 * (S.mod?.duetMultBonus || 1))
          S.score += bonus
          S.crowd = clamp(S.crowd + 25, 0, 100)
          S.stats.duets++
          sndSuccess()
          burstConfetti(16)
          addToast(`完美对唱！+${bonus}`, true)
        } else {
          addToast('没跟上节奏…下次再来')
        }
      }
    }
  } else if (ev.type === 'gust') {
    ev.t--
    if (ev.t <= 90) ev.active = false
    if (ev.t <= 0) {
      S.event = null
      cooldown(S)
      if (S.broken === 0) {
        const bonus = gain(S, 120)
        S.score += bonus
        S.stats.gusts++
        sndSuccess()
        addToast(`扛过阵风！+${bonus}`, true)
      }
    }
  } else if (ev.type === 'rosin') {
    ev.t--
    if (!ev.got && inZone(S) && S.broken === 0 && !S.pinched) {
      ev.got = true
      S.rosinBoost = 180
      S.tension = clamp(S.tension - 0.45, 0, 1)
      const bonus = gain(S, 80)
      S.score += bonus
      S.stats.rosins++
      sndRosin()
      addToast(`蹭到松香！+${bonus}`, true)
      S.event = null
      cooldown(S)
      return
    }
    if (ev.t <= 0) {
      S.event = null
      cooldown(S)
      addToast('松香飘走了')
    }
  } else if (ev.type === 'cat') {
    if (ev.stage === 'stalk') {
      ev.t--
      const x0 = ev.fromLeft ? -24 : w + 24
      const target = ev.fromLeft ? cx - 55 : cx + 55
      ev.px = x0 + (target - x0) * (1 - ev.t / 300)
      const scaring = S.speed >= CAT_SCARE_LO && S.broken === 0
      if (scaring) ev.scare += 1
      else ev.scare = Math.max(0, ev.scare - 0.4)
      if (ev.scare >= 80) {
        ev.stage = 'flee'
        ev.t = 44
        const bonus = gain(S, 200)
        S.score += bonus
        S.crowd = clamp(S.crowd + 15, 0, 100)
        S.stats.cats++
        sndMeow()
        sndSuccess()
        burstConfetti(14)
        addToast(`吓跑野猫！+${bonus}`, true)
      } else if (ev.t <= 0) {
        S.event = null
        cooldown(S)
        if (S.broken === 0) {
          S.broken = 70
          S.speed = 0
          S.tension = 0
          S.brokenN++
        }
        S.combo = 0
        S.crowd = clamp(S.crowd - 20, 0, 100)
        sndSnap()
        sndMeow()
        S.shake = 12
        addToast('被野猫拍了一爪，线断了！', true)
      }
    } else {
      ev.t--
      ev.px += ev.fromLeft ? -7 : 7
      if (ev.t <= 0) {
        S.event = null
        cooldown(S)
      }
    }
  } else if (ev.type === 'golden') {
    ev.t--
    if (!ev.caught && inZone(S) && S.broken === 0 && !S.pinched) {
      ev.caught = true
      const bonus = gain(S, 500)
      S.score += bonus
      S.crowd = clamp(S.crowd + 20, 0, 100)
      S.stats.golden++
      sndChime()
      burstConfetti(24)
      addToast(`接住金蝉！+${bonus}`, true)
    }
    if (ev.t <= 0) {
      S.event = null
      cooldown(S)
      if (!ev.caught) {
        sndWhiff()
        addToast('金蝉一闪而过…')
      }
    }
  }

  if (ev?.pulse > 0) ev.pulse--
}
