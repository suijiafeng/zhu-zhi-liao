import { getTitle, ROUND_TIME } from '../constants.js'
import { baseHud } from './hud.js'
import { addSeenMod } from '../seenScenarios.js'
import { awardStamps } from '../stamps.js'

export function classicTickEnd(S) {
  S.timeLeft--
  if (S.timeLeft <= 0) {
    return {
      over: true,
      result: finishResult(S, {
        mode: 'classic',
        survived: ROUND_TIME,
      }),
    }
  }
  return { over: false }
}

function finishResult(S, extra) {
  const seen = S.mod?.id ? addSeenMod(S.mod.id) : null
  const result = {
    score: S.score,
    title: getTitle(S.score),
    stats: { ...S.stats },
    maxCombo: S.maxCombo,
    brokenN: S.brokenN,
    mod: S.mod,
    ...extra,
  }
  const { newStamps, stampIds } = awardStamps(result, seen)
  result.newStamps = newStamps
  result.stampIds = stampIds
  return result
}

export function classicHud(S) {
  return {
    ...baseHud(S),
    time: Math.ceil(S.timeLeft / 60),
    mode: 'classic',
  }
}

export { finishResult }
