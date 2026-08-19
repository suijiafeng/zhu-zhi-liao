import { getTitle } from '../constants.js'
import { baseHud } from './hud.js'
import { finishResult } from './classic.js'

export function endlessTickEnd(S) {
  S.survived++
  // 断线动画末段再结算，让蝉飞走看得见
  if (S.broken === 1) {
    return {
      over: true,
      result: finishResult(S, {
        mode: 'endless',
        survived: Math.floor(S.survived / 60),
        reason: '断线收工',
      }),
    }
  }
  if (S.crowdFailArmed && S.crowd <= 0 && S.broken === 0) {
    return {
      over: true,
      result: finishResult(S, {
        mode: 'endless',
        survived: Math.floor(S.survived / 60),
        reason: '观众散场',
      }),
    }
  }
  return { over: false }
}

export function endlessHud(S) {
  return {
    ...baseHud(S),
    time: Math.floor(S.survived / 60),
    mode: 'endless',
  }
}
