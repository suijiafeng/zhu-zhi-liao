import { BREAK_SPEED, COMBO_SHIELD_AT } from './constants.js'
import { clamp } from './utils.js'
import { sndSnap, sndShield } from '../audio/sfx.js'

export function applySpinInput(S, pointerAngle) {
  if (S.lastPtrAngle !== null) {
    let da = pointerAngle - S.lastPtrAngle
    if (da > Math.PI) da -= Math.PI * 2
    if (da < -Math.PI) da += Math.PI * 2
    S.speed += Math.abs(da) * 0.09
  }
  S.lastPtrAngle = pointerAngle
}

export function stepPhysics(S, { addToast }) {
  if (S.shake > 0) {
    S.shake *= 0.85
    if (S.shake < 0.5) S.shake = 0
  }

  if (S.flash > 0) S.flash *= 0.82
  if (S.flash < 0.05) S.flash = 0

  const gustBoost = S.event?.type === 'gust' && S.event.active ? S.event.force : 0
  if (gustBoost > 0 && !S.pinched) {
    S.speed = Math.max(S.speed, gustBoost)
  }

  const baseDecay = S.pinched ? 0.968 : 0.975
  S.speed *= 1 - (1 - baseDecay) * (S.mod?.decayMult ?? 1)
  if (S.speed < 0.002) S.speed = 0
  S.angle += S.speed

  if (S.rosinBoost > 0) S.rosinBoost--

  const breakAt = BREAK_SPEED - (S.mode === 'endless' ? Math.min(S.survived / 60 / 180, 0.06) : 0)
  if (S.speed > breakAt) {
    S.tension += 0.02 * (S.mod?.snapMult ?? 1)
    if (S.tension >= 1 && S.broken === 0) {
      if (S.shield) {
        S.shield = false
        S.tension = 0
        S.speed *= 0.55
        S.combo = Math.floor(S.combo / 2)
        S.stats.shields++
        sndShield()
        S.shake = 8
        addToast('护盾挡下断线！', true)
      } else {
        S.broken = 70
        S.speed = 0
        S.tension = 0
        S.combo = 0
        S.brokenN++
        S.crowd = clamp(S.crowd - 30, 0, 100)
        sndSnap()
        S.shake = 14
        addToast('甩太猛，线断了！', true)
      }
    }
  } else {
    S.tension = clamp(S.tension - 0.015 - (S.rosinBoost > 0 ? 0.02 : 0), 0, 1)
  }

  if (S.broken > 0) S.broken--

  if (S.flight > 0) {
    S.flight--
    if (S.flight === 0) addToast('重新系上，接着甩！')
  }

  if (S.combo >= COMBO_SHIELD_AT && !S.shield && S.broken === 0) {
    S.shield = true
  }
}

export function inZone(S) {
  const widen = (S.fever > 0 ? 0.05 : 0) + (S.rosinBoost > 0 ? 0.04 : 0)
  return S.speed >= S.zone.lo - widen && S.speed <= S.zone.hi + widen
}
