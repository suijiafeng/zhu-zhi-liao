import { clamp, rand } from './utils.js'
import {
  beep,
  sndCombo,
  sndCrowdWa,
  sndFanfare,
  sndLightning,
  sndThunder,
} from '../audio/sfx.js'
import { inZone } from './physics.js'
import { rollZone } from './scenarios.js'
import { gain } from './state.js'

export function stepScoring(S, { addToast, burstConfetti }) {
  if (S.flight > 0) return

  const scoring = inZone(S) && S.broken === 0 && !S.pinched
  const { cx, cy } = S.layout

  if (scoring) {
    S.inZoneFrames++
    S.crowd = clamp(S.crowd + (S.fever > 0 ? 0.1 : 0.22), 0, 100)
    const before = S.flyCharge
    S.flyCharge = clamp(S.flyCharge + (S.fever > 0 ? 0.4 : 0.22), 0, 100)
    if (before < 100 && S.flyCharge >= 100) {
      addToast('弦满了！放飞它！', true)
      sndCombo(10)
    }
    if (S.inZoneFrames % 30 === 0) {
      S.combo++
      S.comboT = 90
      if (S.combo > S.maxCombo) S.maxCombo = S.combo
      const mult = S.fever > 0 ? 2 : 1
      const pts = gain(S, 5 * Math.min(S.combo, 15) * mult)
      S.score += pts
      sndCombo(S.combo)
      S.notes.push({
        x: cx + rand(-60, 60),
        y: cy - 40,
        vy: -1.5,
        life: 50,
        s: pts,
        fever: S.fever > 0,
      })
      if (S.combo % 6 === 0) addToast(`${S.combo} 连拍！`)
    }
  } else {
    S.inZoneFrames = 0
    if (S.flyCharge < 100) S.flyCharge = clamp(S.flyCharge - 0.05, 0, 100)
    if (!S.pinched) S.crowd = clamp(S.crowd - 0.12, 0, 100)
    if (S.comboT > 0) S.comboT--
    else S.combo = 0
  }

  if (S.fever <= 0) {
    S.zoneTimer++
    const modDrift = S.mod?.driftFrames || 300
    const driftEvery =
      S.mode === 'endless' ? Math.max(180, modDrift - S.survived / 8) : modDrift
    if (S.zoneTimer > driftEvery) {
      S.zoneTimer = 0
      S.zone = rollZone(S.mod)
      if (S.mode === 'endless') {
        const narrow = Math.min(S.survived / 60 / 200, 0.04)
        if (S.zone.hi - S.zone.lo - narrow >= 0.08) S.zone.hi -= narrow
        else S.zone.hi = S.zone.lo + 0.08
      }
      addToast('节奏变了，跟上！')
    }
  } else {
    S.fever--
    if (S.fever === 0) addToast('狂欢结束，稳住节奏')
  }

  const feverAt = S.mod?.feverThreshold ?? 100
  if (S.crowd >= feverAt && S.fever <= 0) {
    S.crowd = 30
    S.fever = 8 * 60
    S.stats.feverN++
    S.score += gain(S, 100)
    sndCrowdWa()
    sndFanfare()
    S.shake = 10
    burstConfetti(50)
    addToast('哇声一片！狂欢 ×2', true)
    S.crowdFaces.forEach((f) => {
      f.jump = rand(14, 24)
      f.wa = 40
    })
  }

  if (S.crowd > 40) S.crowdFailArmed = true

  if (S.crowd > 25 && S.tick % Math.max(20, 90 - S.crowd) === 0) {
    const f = S.crowdFaces[Math.floor(rand(0, S.crowdFaces.length))]
    f.wa = 26
    f.jump = rand(6, 12)
    if (Math.random() < 0.4) beep(rand(300, 380), 0.3, 'sine', 0.04, -80)
  }

  if (S.mod?.thunder && S.fever <= 0) {
    S.thunderTimer = (S.thunderTimer ?? rand(160, 260)) - 1
    if (S.thunderTimer <= 0) {
      S.thunderTimer = rand(220, 360)
      S.shake = 4
      sndThunder()
    }
  }
  if (S.mod?.lightning && S.fever <= 0) {
    S.lightningTimer = (S.lightningTimer ?? rand(140, 240)) - 1
    if (S.lightningTimer <= 0) {
      S.lightningTimer = rand(200, 340)
      S.flash = 1
      sndLightning()
    }
  }
}
